import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, unauthorized } from "@/lib/api"
import { AIError, parseModelJson, streamCompletion } from "@/lib/ai"
import { answersSchema, productBriefSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import { detectNewSections } from "@/lib/stream"
import { BRIEF_SYSTEM_PROMPT, answeredContext, buildFullBriefPrompt } from "@/lib/brief-prompt"
import { snapshotBriefVersion } from "@/lib/versions"

export const maxDuration = 120

// Streams generation progress as Server-Sent Events:
//   event: progress  data: {"section":"goals"}
//   event: done      data: <updated brief>
//   event: error     data: {"error":"..."}
// Preconditions (auth, missing brief, no answers) are returned as normal
// JSON errors before the stream starts; once streaming begins every outcome
// — including a missing API key — arrives as an event.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const brief = await prisma.projectBrief.findUnique({ where: { id } })
  if (!brief) return notFound()

  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)
  const context = answeredContext(
    parseQuestions(brief.questions),
    answersResult.success ? answersResult.data : {}
  )
  if (!context) {
    return jsonError("The client has not answered the questionnaire yet.", 400)
  }

  const prompt = buildFullBriefPrompt({
    clientName: brief.clientName,
    projectName: brief.projectName,
    context,
  })

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) =>
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))

      const seen = new Set<string>()
      let accumulated = ""

      try {
        const content = await streamCompletion({
          system: BRIEF_SYSTEM_PROMPT,
          prompt,
          // Cancel the upstream request if the client disconnects.
          signal: req.signal,
          onDelta: (delta) => {
            accumulated += delta
            for (const section of detectNewSections(accumulated, seen)) {
              send("progress", { section })
            }
          },
        })

        const parsed = productBriefSchema.safeParse(parseModelJson(content))
        if (!parsed.success) {
          console.error("Generated brief failed validation:", parsed.error.issues[0])
          send("error", { error: "The AI returned an unusable brief. Please try again." })
          return
        }

        await snapshotBriefVersion(id, brief.generatedBrief, "Before regeneration")

        const updated = await prisma.projectBrief.update({
          where: { id },
          data: {
            generatedBrief: parsed.data,
            ...(brief.status === "SUBMITTED" && { status: "REVIEWED" as const }),
          },
        })
        send("done", updated)
      } catch (err) {
        const message =
          err instanceof AIError
            ? err.message
            : "Failed to generate the brief. Please try again."
        if (!(err instanceof AIError)) console.error("generate stream failed:", err)
        send("error", { error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  })
}

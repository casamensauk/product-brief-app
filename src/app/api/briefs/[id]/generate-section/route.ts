import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, parseBody, unauthorized } from "@/lib/api"
import { AIError, completeJson } from "@/lib/ai"
import { answersSchema, productBriefSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import { BRIEF_SECTION_KEYS } from "@/lib/brief-sections"
import { BRIEF_SYSTEM_PROMPT, answeredContext, buildSectionPrompt } from "@/lib/brief-prompt"
import { snapshotBriefVersion } from "@/lib/versions"

export const maxDuration = 120

const bodySchema = z.object({
  section: z.enum(BRIEF_SECTION_KEYS as [string, ...string[]]),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const { data, error } = await parseBody(req, bodySchema)
  if (error) return error
  const section = data.section as keyof typeof productBriefSchema.shape

  const brief = await prisma.projectBrief.findUnique({ where: { id } })
  if (!brief) return notFound()

  const questions = parseQuestions(brief.questions)
  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)
  const context = answeredContext(questions, answersResult.success ? answersResult.data : {})
  if (!context) {
    return jsonError("The client has not answered the questionnaire yet.", 400)
  }

  const prompt = buildSectionPrompt({
    clientName: brief.clientName,
    projectName: brief.projectName,
    context,
    section,
  })

  try {
    const raw = await completeJson({ system: BRIEF_SYSTEM_PROMPT, prompt })
    const sectionValue = (raw as Record<string, unknown>)?.[section]
    if (sectionValue === undefined) {
      return jsonError("The AI returned an unusable section. Please try again.", 502)
    }

    // Validate the merged brief so a single-section fix can't corrupt the rest.
    const base = productBriefSchema.parse(brief.generatedBrief ?? {})
    const merged = productBriefSchema.safeParse({ ...base, [section]: sectionValue })
    if (!merged.success) {
      console.error("Regenerated section failed validation:", merged.error.issues[0])
      return jsonError("The AI returned an unusable section. Please try again.", 502)
    }

    await snapshotBriefVersion(id, brief.generatedBrief, "Before regeneration")

    const updated = await prisma.projectBrief.update({
      where: { id },
      data: { generatedBrief: merged.data },
    })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof AIError) return jsonError(err.message, err.status)
    console.error("generate-section failed:", err)
    return jsonError("Failed to regenerate the section. Please try again.", 500)
  }
}

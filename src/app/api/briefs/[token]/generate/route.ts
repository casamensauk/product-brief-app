import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, unauthorized } from "@/lib/api"
import { AIError, completeJson } from "@/lib/ai"
import { answersSchema, productBriefSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"

export const maxDuration = 120

const SYSTEM_PROMPT = `You are an expert business analyst and product strategist at a software agency.
You turn raw client discovery answers into rigorous, actionable product briefs.
You always respond with a single valid JSON object and nothing else.
Never invent facts: where the client did not provide information, say so explicitly (e.g. "Not specified — clarify with client") or list it under openQuestions.`

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { token } = await params

  const brief = await prisma.projectBrief.findUnique({ where: { shareToken: token } })
  if (!brief) return notFound()

  const questions = parseQuestions(brief.questions)
  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)
  const answers = answersResult.success ? answersResult.data : {}

  const answered = questions
    .map((q) => {
      const value = answers[q.id]
      const text = Array.isArray(value) ? value.join(", ") : value?.trim()
      return text ? `Q: ${q.label}\nA: ${text}` : null
    })
    .filter(Boolean)

  if (answered.length === 0) {
    return jsonError("The client has not answered the questionnaire yet.", 400)
  }

  const prompt = `Create a complete product brief from this client discovery questionnaire.

Project metadata:
- Client: ${brief.clientName}
- Project: ${brief.projectName || "(not specified)"}

Questionnaire answers:
${answered.join("\n\n")}

Instructions:
- Base everything strictly on the answers above. Flag gaps rather than inventing details.
- requirements: extract every explicit or clearly implied requirement, categorised (Functional | Non-functional | Technical | Operational | Transitional) and prioritised with MoSCoW (Must-have | Should-have | Nice-to-have).
- userStories: written as "As a <user>, I want <capability>, so that <benefit>".
- scope.outOfScope: things adjacent to the request that are explicitly or implicitly excluded from a first version.
- risks: real delivery risks for this specific project, each with a mitigation.
- openQuestions: concrete questions the agency should ask the client next.
- executiveSummary: 3-5 sentences a stakeholder could read in isolation.

Return JSON in exactly this shape:
{
  "executiveSummary": "string",
  "problemStatement": "string",
  "goals": ["string"],
  "targetUsers": [{ "persona": "string", "description": "string" }],
  "stakeholders": [{ "name": "string", "role": "string", "interest": "string" }],
  "userStories": ["string"],
  "requirements": [{ "name": "string", "description": "string", "category": "Functional|Non-functional|Technical|Operational|Transitional", "priority": "Must-have|Should-have|Nice-to-have" }],
  "scope": { "inScope": ["string"], "outOfScope": ["string"] },
  "assumptions": ["string"],
  "risks": [{ "risk": "string", "mitigation": "string" }],
  "openQuestions": ["string"],
  "timeline": "string",
  "budget": "string",
  "successMetrics": ["string"]
}`

  try {
    const raw = await completeJson({ system: SYSTEM_PROMPT, prompt })
    const parsed = productBriefSchema.safeParse(raw)
    if (!parsed.success) {
      console.error("Generated brief failed validation:", parsed.error.issues[0])
      return jsonError("The AI returned an unusable brief. Please try again.", 502)
    }

    const updated = await prisma.projectBrief.update({
      where: { shareToken: token },
      data: {
        generatedBrief: parsed.data,
        // Move the workflow forward, but never regress a later status.
        ...(brief.status === "SUBMITTED" && { status: "REVIEWED" as const }),
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof AIError) return jsonError(err.message, err.status)
    console.error("generate failed:", err)
    return jsonError("Failed to generate the brief. Please try again.", 500)
  }
}

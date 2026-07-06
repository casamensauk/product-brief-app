import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, parseBody, unauthorized } from "@/lib/api"
import { AIError, completeJson } from "@/lib/ai"
import { questionsSchema, QUESTION_TYPES } from "@/lib/schemas"

export const maxDuration = 120

const bodySchema = z.object({
  instructions: z.string().trim().max(2000).optional(),
})

// What the model returns: questions without ids (assigned server-side).
const aiResponseSchema = z.object({
  questions: z
    .array(
      z.object({
        label: z.string().min(1).max(500),
        helpText: z.string().max(1000).optional(),
        placeholder: z.string().max(500).optional(),
        type: z.enum(QUESTION_TYPES).catch("long_text"),
        options: z.array(z.string().min(1).max(200)).max(20).optional(),
        required: z.boolean().catch(false),
      })
    )
    .min(3)
    .max(20),
})

const SYSTEM_PROMPT = `You are an expert product discovery consultant who designs client intake questionnaires for software projects.
You always respond with a single valid JSON object and nothing else.`

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const { data, error } = await parseBody(req, bodySchema)
  if (error) return error

  const brief = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true, clientName: true, projectName: true, status: true },
  })
  if (!brief) return notFound()

  const prompt = `Design a discovery questionnaire that a software agency will send to a client before scoping their project.

Project context:
- Client: ${brief.clientName}
- Project: ${brief.projectName || "(not specified)"}
${data.instructions ? `- Notes from the agency: ${data.instructions}` : ""}

Guidelines:
- 6 to 10 questions, ordered from broad context to specifics.
- Written in plain, friendly language a non-technical client understands. No jargon.
- Cover: company background, the problem, target users, must-have features, integrations/constraints, design preferences, success criteria, timeline and budget.
- Prefer "long_text" for open questions. Use "single_select" or "multi_select" (with an "options" array of 2-8 short choices) only when fixed choices genuinely help, e.g. platforms or budget ranges.
- Mark a question "required" only when scoping is impossible without it.
- "helpText" is one short sentence of guidance; "placeholder" is a brief example answer (only for text questions).

Return JSON in exactly this shape:
{
  "questions": [
    {
      "label": "string",
      "helpText": "string (optional)",
      "placeholder": "string (optional)",
      "type": "short_text" | "long_text" | "single_select" | "multi_select",
      "options": ["string", ...] (only for select types),
      "required": true | false
    }
  ]
}`

  try {
    const raw = await completeJson({ system: SYSTEM_PROMPT, prompt })
    const parsed = aiResponseSchema.safeParse(raw)
    if (!parsed.success) {
      console.error("AI questionnaire failed validation:", parsed.error.issues[0])
      return jsonError("The AI returned an unusable questionnaire. Please try again.", 502)
    }

    const questions = parsed.data.questions.map((q) => ({
      ...q,
      id: randomUUID(),
      // Drop stray options on text questions; validated for selects below.
      options: q.type === "single_select" || q.type === "multi_select" ? q.options : undefined,
    }))

    const validated = questionsSchema.safeParse(questions)
    if (!validated.success) {
      console.error("AI questionnaire failed validation:", validated.error.issues[0])
      return jsonError("The AI returned an unusable questionnaire. Please try again.", 502)
    }

    return NextResponse.json({ questions: validated.data })
  } catch (err) {
    if (err instanceof AIError) return jsonError(err.message, err.status)
    console.error("suggest-questions failed:", err)
    return jsonError("Failed to generate questions. Please try again.", 500)
  }
}

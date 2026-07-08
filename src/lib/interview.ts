import { randomUUID } from "crypto"
import * as z from "zod"
import { questionTypeSchema, type Answers, type Question } from "@/lib/schemas"

/**
 * AI-guided adaptive interview: instead of a fixed questionnaire, each next
 * question is chosen by the model from the transcript so far. Capped so a
 * client is never stuck answering forever.
 */
export const MAX_INTERVIEW_QUESTIONS = 15

/** Topics a solid product brief needs covered — not one question each. */
export const COVERAGE_AREAS = [
  "company background",
  "problem to solve",
  "target users",
  "must-have features",
  "integrations & constraints",
  "design preferences",
  "success metrics",
  "timeline",
  "budget",
  "risks & concerns",
]

/** The single fixed opening question every adaptive interview starts with. */
export function seedQuestion(): Question {
  return {
    id: randomUUID(),
    label: "Tell us about your company and the project you have in mind — what should it do?",
    helpText:
      "A few sentences in plain language is perfect. The next questions adapt to what you write.",
    type: "long_text",
    required: true,
  }
}

export const INTERVIEW_SYSTEM_PROMPT = `You are an expert discovery interviewer at a software agency.
You conduct a friendly, adaptive interview with a client to gather everything an agency needs to write a product brief.
You ask ONE question at a time, in plain, friendly, non-technical language that a non-technical founder can follow easily.
You never repeat or re-ask anything the client has already told you in the transcript.
You always respond with a single valid JSON object and nothing else.`

export function buildNextQuestionPrompt(opts: {
  clientName: string
  projectName: string | null
  transcript: string
  askedCount: number
  maxQuestions: number
}): string {
  return `Here is the discovery interview so far for a new client project.

Client: ${opts.clientName}
Project: ${opts.projectName || "(not specified)"}
Questions asked so far: ${opts.askedCount} (maximum ${opts.maxQuestions})

Interview transcript:
${opts.transcript}

Your job: decide the single best next question to ask in order to complete a solid product brief.

Coverage areas a good brief needs (not necessarily one question each — some may already be covered by earlier answers):
${COVERAGE_AREAS.map((area) => `- ${area}`).join("\n")}

Instructions:
- Pick the coverage area that is least covered by the transcript so far and ask one clear, specific question about it.
- Prefer an open "long_text" question. Only use "single_select" or "multi_select" (with 2-8 concrete options) when a fixed set of choices genuinely helps the client answer faster than free text.
- Never repeat or rephrase a question that's already been answered in the transcript.
- Keep the question in plain, friendly, non-technical language.
- If the transcript already covers enough for a solid brief, OR the number of questions asked so far (${opts.askedCount}) is already at or above the maximum (${opts.maxQuestions}), set "done" to true and "question" to null.

Return JSON in exactly this shape and nothing else:
{
  "done": boolean,
  "question": { "label": "string", "helpText": "string (optional)", "placeholder": "string (optional)", "type": "short_text"|"long_text"|"single_select"|"multi_select", "options": ["string"] (optional, only for select types), "required": boolean } | null,
  "coveredAreas": ["string"]
}
"coveredAreas" must be the subset of the coverage area names listed above that are already adequately covered by the transcript.`
}

const nextQuestionQuestionSchema = z.object({
  label: z.string().min(1).max(500),
  helpText: z.string().max(1000).optional(),
  placeholder: z.string().max(500).optional(),
  type: questionTypeSchema.catch("long_text"),
  options: z.array(z.string().min(1).max(200)).max(20).optional(),
  required: z.boolean().catch(false),
})

export const nextQuestionResponseSchema = z.object({
  done: z.boolean().catch(false),
  question: nextQuestionQuestionSchema.nullable().optional(),
  coveredAreas: z.array(z.string()).catch([]),
})

export type NextQuestionResponse = z.infer<typeof nextQuestionResponseSchema>

/** Optional override model for the interview's next-question calls. */
export function interviewModel(): string | undefined {
  return process.env.OPENROUTER_INTERVIEW_MODEL || undefined
}

/** Render the full interview so far as "Q: … / A: …" blocks for the prompt. */
export function buildTranscript(questions: Question[], answers: Answers): string {
  return questions
    .map((q) => {
      const value = answers[q.id]
      const text = Array.isArray(value) ? value.join(", ") : value?.trim()
      return `Q: ${q.label}\nA: ${text || "(not answered)"}`
    })
    .join("\n\n")
}

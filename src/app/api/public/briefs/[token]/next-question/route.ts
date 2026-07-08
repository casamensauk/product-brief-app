import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound, parseBody, tooManyRequests } from "@/lib/api"
import { AIError, completeJson } from "@/lib/ai"
import { answersSchema, type Answers, type Question } from "@/lib/schemas"
import { parseQuestions, sanitizeAnswers } from "@/lib/answers"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import {
  INTERVIEW_SYSTEM_PROMPT,
  MAX_INTERVIEW_QUESTIONS,
  buildNextQuestionPrompt,
  buildTranscript,
  interviewModel,
  nextQuestionResponseSchema,
} from "@/lib/interview"

export const maxDuration = 60

// Public endpoint: the unguessable share token is the capability. Picks the
// next question of an AI-guided adaptive interview and appends it to the
// brief's questionnaire.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const limit = checkRateLimit(`next-question:${clientIp(req)}:${token}`, {
    windowMs: 60_000,
    max: 5,
  })
  if (!limit.allowed) return tooManyRequests(limit.retryAfter)

  const { data, error } = await parseBody(req, z.object({ answers: answersSchema.optional() }))
  if (error) return error

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      status: true,
      mode: true,
      clientName: true,
      projectName: true,
      questions: true,
      rawClientAnswers: true,
    },
  })
  if (!brief) return notFound()

  if (brief.status !== "DRAFT") {
    return jsonError("This questionnaire has already been submitted", 409)
  }
  if (brief.mode !== "ADAPTIVE") {
    return jsonError("This questionnaire is not an AI-guided interview", 400)
  }

  const questions = parseQuestions(brief.questions)

  let answers: Answers
  if (data.answers) {
    answers = sanitizeAnswers(questions, data.answers)
    await prisma.projectBrief.update({
      where: { shareToken: token },
      data: { rawClientAnswers: answers },
    })
  } else {
    const parsedAnswers = answersSchema.safeParse(brief.rawClientAnswers)
    answers = parsedAnswers.success ? parsedAnswers.data : {}
  }

  if (questions.length >= MAX_INTERVIEW_QUESTIONS) {
    return NextResponse.json({ done: true, coveredAreas: [] })
  }

  let raw: unknown
  try {
    raw = await completeJson({
      system: INTERVIEW_SYSTEM_PROMPT,
      prompt: buildNextQuestionPrompt({
        clientName: brief.clientName,
        projectName: brief.projectName,
        transcript: buildTranscript(questions, answers),
        askedCount: questions.length,
        maxQuestions: MAX_INTERVIEW_QUESTIONS,
      }),
      model: interviewModel(),
    })
  } catch (err) {
    if (err instanceof AIError) return jsonError(err.message, err.status)
    console.error("next-question failed:", err)
    return jsonError("Failed to pick the next question. Please try again.", 500)
  }

  const parsed = nextQuestionResponseSchema.safeParse(raw)
  if (!parsed.success) {
    return jsonError("The AI returned an unusable question. Please try again.", 502)
  }

  const { done, question: aiQuestion, coveredAreas } = parsed.data
  if (done || !aiQuestion || !aiQuestion.label.trim()) {
    return NextResponse.json({ done: true, coveredAreas })
  }

  // Select types need at least two options — fall back to free text rather
  // than fail the whole interview if the model skimps on choices.
  const isSelect = aiQuestion.type === "single_select" || aiQuestion.type === "multi_select"
  const hasEnoughOptions = (aiQuestion.options?.length ?? 0) >= 2
  const usesOptions = isSelect && hasEnoughOptions

  const question: Question = {
    id: randomUUID(),
    label: aiQuestion.label,
    ...(aiQuestion.helpText ? { helpText: aiQuestion.helpText } : {}),
    ...(aiQuestion.placeholder ? { placeholder: aiQuestion.placeholder } : {}),
    type: usesOptions ? aiQuestion.type : isSelect ? "long_text" : aiQuestion.type,
    ...(usesOptions ? { options: aiQuestion.options } : {}),
    required: aiQuestion.required,
  }

  await prisma.projectBrief.update({
    where: { shareToken: token },
    data: { questions: [...questions, question] },
  })

  return NextResponse.json({ done: false, question, coveredAreas })
}

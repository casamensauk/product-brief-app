import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound, parseBody } from "@/lib/api"
import { answersSchema } from "@/lib/schemas"
import { missingRequired, parseQuestions, sanitizeAnswers } from "@/lib/answers"

// Public endpoint: saves the final answers and locks the questionnaire.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data, error } = await parseBody(req, z.object({ answers: answersSchema }))
  if (error) return error

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true, questions: true },
  })
  if (!brief) return notFound()

  if (brief.status !== "DRAFT") {
    return jsonError("This questionnaire has already been submitted", 409)
  }

  const questions = parseQuestions(brief.questions)
  const clean = sanitizeAnswers(questions, data.answers)

  const missing = missingRequired(questions, clean)
  if (missing.length > 0) {
    return jsonError(`Please answer: ${missing.join("; ")}`, 400)
  }

  await prisma.projectBrief.update({
    where: { shareToken: token },
    data: {
      rawClientAnswers: clean,
      status: "SUBMITTED",
      submittedAt: new Date(),
    },
  })
  return NextResponse.json({ ok: true })
}

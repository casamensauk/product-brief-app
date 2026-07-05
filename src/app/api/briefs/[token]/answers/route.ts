import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound, parseBody } from "@/lib/api"
import { answersSchema } from "@/lib/schemas"
import { parseQuestions, sanitizeAnswers } from "@/lib/answers"

// Public endpoint: the unguessable share token is the capability. It only
// accepts questionnaire answers — nothing else on the brief can be written.
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
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

  await prisma.projectBrief.update({
    where: { shareToken: token },
    data: { rawClientAnswers: clean },
  })
  return NextResponse.json({ ok: true })
}

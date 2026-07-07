import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, parseBody, unauthorized } from "@/lib/api"
import { followUpSchema, type Question } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import {
  appUrl,
  emailConfigured,
  followUpEmail,
  sendEmail,
} from "@/lib/email"
import { getAgencyName } from "@/lib/settings"

// Appends follow-up questions and reopens the questionnaire for another round.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const { data, error } = await parseBody(req, followUpSchema)
  if (error) return error

  const brief = await prisma.projectBrief.findUnique({ where: { id } })
  if (!brief) return notFound()

  const existing = parseQuestions(brief.questions)
  // questionsSchema caps questionnaires at 50; keep the combined set valid so
  // later reads don't fail validation and fall back to the default template.
  if (existing.length + data.questions.length > 50) {
    return jsonError("That would push the questionnaire past its 50-question limit.", 400)
  }

  const followUps: Question[] = data.questions.map((label) => ({
    id: randomUUID(),
    label,
    type: "long_text",
    helpText: "Follow-up question after our first review",
    required: false,
  }))

  const updated = await prisma.projectBrief.update({
    where: { id },
    data: {
      questions: [...existing, ...followUps],
      // Reopen for answering (also re-enables attachments).
      status: "DRAFT",
      submittedAt: null,
    },
  })

  // The brief is already saved; a failing email must not fail the request
  // (a retry would append duplicate questions).
  let emailed = false
  if (brief.contactEmail && emailConfigured()) {
    try {
      const agencyName = await getAgencyName()
      const email = followUpEmail({
        agencyName,
        projectName: brief.projectName,
        clientName: brief.clientName,
        url: appUrl(`/q/${brief.shareToken}`),
      })
      const result = await sendEmail({
        to: brief.contactEmail,
        subject: email.subject,
        html: email.html,
        text: email.text,
      })
      emailed = result.sent
    } catch (err) {
      console.error("[follow-up] email failed:", err)
    }
  }

  return NextResponse.json({ ...updated, emailed })
}

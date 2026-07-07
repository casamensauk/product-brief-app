import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { notFound, parseBody, unauthorized } from "@/lib/api"
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

  let emailed = false
  if (brief.contactEmail && emailConfigured()) {
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
  }

  return NextResponse.json({ ...updated, emailed })
}

import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound, parseBody, tooManyRequests } from "@/lib/api"
import { answersSchema } from "@/lib/schemas"
import { missingRequired, parseQuestions, sanitizeAnswers } from "@/lib/answers"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import { appUrl, sendEmail, submissionNotificationEmail } from "@/lib/email"
import { getAgencyName } from "@/lib/settings"

// Public endpoint: saves the final answers and locks the questionnaire.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const limit = checkRateLimit(`submit:${clientIp(req)}:${token}`, {
    windowMs: 60_000,
    max: 5,
  })
  if (!limit.allowed) return tooManyRequests(limit.retryAfter)

  const { data, error } = await parseBody(req, z.object({ answers: answersSchema }))
  if (error) return error

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: {
      id: true,
      status: true,
      questions: true,
      clientName: true,
      projectName: true,
      owner: { select: { email: true } },
    },
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

  await notifyOwner(brief)

  return NextResponse.json({ ok: true })
}

// Fire-and-forget owner notification. Never throws — a failed email must not
// fail the client's submission.
async function notifyOwner(brief: {
  id: string
  clientName: string
  projectName: string | null
  owner: { email: string } | null
}): Promise<void> {
  if (!brief.owner?.email) return
  try {
    const agencyName = await getAgencyName()
    const email = submissionNotificationEmail({
      agencyName,
      clientName: brief.clientName,
      projectName: brief.projectName,
      dashboardUrl: appUrl(`/dashboard/brief/${brief.id}`),
    })
    await sendEmail({
      to: brief.owner.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    })
  } catch (err) {
    console.error("[submit] owner notification failed:", err)
  }
}

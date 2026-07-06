import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, unauthorized } from "@/lib/api"
import {
  appUrl,
  emailConfigured,
  questionnaireInviteEmail,
  sendEmail,
} from "@/lib/email"
import { getAgencyName } from "@/lib/settings"

// Emails the client questionnaire link to the brief's contact email.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { id },
    select: {
      clientName: true,
      projectName: true,
      contactEmail: true,
      shareToken: true,
    },
  })
  if (!brief) return notFound()
  if (!brief.contactEmail) {
    return jsonError("Add a client contact email before sending the link.", 400)
  }
  if (!emailConfigured()) {
    return jsonError("Email isn't configured on the server. Copy the link instead.", 503)
  }

  const agencyName = await getAgencyName()
  const email = questionnaireInviteEmail({
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
  if (!result.sent) {
    return jsonError("Could not send the email. Please try again.", 502)
  }
  return NextResponse.json({ ok: true, to: brief.contactEmail })
}

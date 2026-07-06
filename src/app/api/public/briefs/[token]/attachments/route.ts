import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound, tooManyRequests } from "@/lib/api"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"
import {
  MAX_ATTACHMENTS_PER_BRIEF,
  MAX_ATTACHMENT_SIZE,
  validateAttachmentType,
} from "@/lib/attachments"

// Public endpoint: the share token is the capability. Uploads are only
// accepted while the questionnaire is still open (DRAFT).
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const limit = checkRateLimit(`attachments:${clientIp(req)}:${token}`, {
    windowMs: 60_000,
    max: 10,
  })
  if (!limit.allowed) return tooManyRequests(limit.retryAfter)

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true, _count: { select: { attachments: true } } },
  })
  if (!brief) return notFound()
  if (brief.status !== "DRAFT") {
    return jsonError("This questionnaire has already been submitted", 409)
  }
  if (brief._count.attachments >= MAX_ATTACHMENTS_PER_BRIEF) {
    return jsonError(`You can attach up to ${MAX_ATTACHMENTS_PER_BRIEF} files.`, 400)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return jsonError("Invalid upload", 400)
  }

  const file = formData.get("file")
  if (!(file instanceof File)) {
    return jsonError("No file provided", 400)
  }
  if (file.size === 0) {
    return jsonError("The file is empty", 400)
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return jsonError("Files must be 5 MB or smaller", 400)
  }

  const typeCheck = validateAttachmentType(file.name, file.type)
  if (!typeCheck.ok) {
    return jsonError(typeCheck.reason, 400)
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  const attachment = await prisma.attachment.create({
    data: {
      briefId: brief.id,
      filename: file.name.slice(0, 255),
      mimeType: file.type,
      size: file.size,
      data: buffer,
    },
    select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
  })

  return NextResponse.json(attachment, { status: 201 })
}

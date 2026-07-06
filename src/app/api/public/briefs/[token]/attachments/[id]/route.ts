import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound } from "@/lib/api"

// Public endpoint: lets a client remove a file they attached before submitting.
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  const { token, id } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true },
  })
  if (!brief) return notFound()
  if (brief.status !== "DRAFT") {
    return jsonError("This questionnaire has already been submitted", 409)
  }

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: { id: true, briefId: true },
  })
  if (!attachment || attachment.briefId !== brief.id) return notFound()

  await prisma.attachment.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

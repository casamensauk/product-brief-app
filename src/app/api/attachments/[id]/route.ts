import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { notFound, unauthorized } from "@/lib/api"
import { requireSession } from "@/lib/session"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const attachment = await prisma.attachment.findUnique({
    where: { id },
    select: { filename: true, mimeType: true, data: true },
  })
  if (!attachment) return notFound()

  const safeName = attachment.filename.replaceAll('"', "")
  return new NextResponse(new Uint8Array(attachment.data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      "Cache-Control": "private, no-store",
    },
  })
}

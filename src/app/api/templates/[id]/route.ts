import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { notFound, unauthorized } from "@/lib/api"

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const existing = await prisma.questionnaireTemplate.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return notFound()

  await prisma.questionnaireTemplate.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

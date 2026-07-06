import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { notFound, unauthorized } from "@/lib/api"

// Issues a fresh client share token, invalidating the previous /q link.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const existing = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return notFound()

  const brief = await prisma.projectBrief.update({
    where: { id },
    data: { shareToken: randomBytes(24).toString("base64url") },
    select: { shareToken: true },
  })
  return NextResponse.json(brief)
}

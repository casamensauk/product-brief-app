import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { notFound, parseBody, unauthorized } from "@/lib/api"
import { shareBriefSchema } from "@/lib/schemas"

// Manages the public read-only brief share link (separate from the client
// questionnaire share token).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const { data, error } = await parseBody(req, shareBriefSchema)
  if (error) return error

  const existing = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true, briefShareToken: true },
  })
  if (!existing) return notFound()

  const briefShareToken =
    data.action === "disable" ? null : randomBytes(24).toString("base64url")

  const brief = await prisma.projectBrief.update({
    where: { id },
    data: { briefShareToken },
    select: { briefShareToken: true },
  })
  return NextResponse.json(brief)
}

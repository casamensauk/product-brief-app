import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { parseBody, unauthorized } from "@/lib/api"
import { createBriefSchema } from "@/lib/schemas"
import { DEFAULT_QUESTIONS } from "@/lib/templates"

export async function GET(req: Request) {
  if (!(await requireSession(req))) return unauthorized()

  const briefs = await prisma.projectBrief.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientName: true,
      projectName: true,
      contactEmail: true,
      shareToken: true,
      status: true,
      submittedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  })
  return NextResponse.json(briefs)
}

export async function POST(req: Request) {
  if (!(await requireSession(req))) return unauthorized()

  const { data, error } = await parseBody(req, createBriefSchema)
  if (error) return error

  const brief = await prisma.projectBrief.create({
    data: {
      clientName: data.clientName,
      projectName: data.projectName || null,
      contactEmail: data.contactEmail || null,
      shareToken: randomBytes(24).toString("base64url"),
      status: "DRAFT",
      questions: DEFAULT_QUESTIONS,
    },
  })
  return NextResponse.json(brief, { status: 201 })
}

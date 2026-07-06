import { NextResponse } from "next/server"
import { randomBytes, randomUUID } from "crypto"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, parseBody, unauthorized } from "@/lib/api"
import { createBriefSchema, questionsSchema, type Question } from "@/lib/schemas"
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
      owner: { select: { name: true } },
    },
  })
  return NextResponse.json(briefs)
}

export async function POST(req: Request) {
  const session = await requireSession(req)
  if (!session) return unauthorized()

  const { data, error } = await parseBody(req, createBriefSchema)
  if (error) return error

  let questions: Question[] = DEFAULT_QUESTIONS
  if (data.templateId && data.templateId !== "default") {
    const template = await prisma.questionnaireTemplate.findUnique({
      where: { id: data.templateId },
      select: { questions: true },
    })
    if (!template) return jsonError("Template not found", 400)
    const parsed = questionsSchema.safeParse(template.questions)
    if (!parsed.success) return jsonError("This template is corrupted", 400)
    // Fresh ids so answers never collide across briefs that share a template.
    questions = parsed.data.map((q) => ({ ...q, id: randomUUID() }))
  }

  const brief = await prisma.projectBrief.create({
    data: {
      clientName: data.clientName,
      projectName: data.projectName || null,
      contactEmail: data.contactEmail || null,
      shareToken: randomBytes(24).toString("base64url"),
      status: "DRAFT",
      questions,
      ownerId: session.user.id,
    },
  })
  return NextResponse.json(brief, { status: 201 })
}

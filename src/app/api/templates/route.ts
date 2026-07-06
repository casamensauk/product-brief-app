import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, parseBody, unauthorized } from "@/lib/api"
import { createTemplateSchema, questionsSchema } from "@/lib/schemas"

const MAX_TEMPLATES = 50

export async function GET(req: Request) {
  if (!(await requireSession(req))) return unauthorized()

  const templates = await prisma.questionnaireTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, questions: true, updatedAt: true },
  })

  return NextResponse.json(
    templates.map((t) => {
      const parsed = questionsSchema.safeParse(t.questions)
      return {
        id: t.id,
        name: t.name,
        questionCount: parsed.success ? parsed.data.length : 0,
        updatedAt: t.updatedAt,
      }
    })
  )
}

export async function POST(req: Request) {
  const session = await requireSession(req)
  if (!session) return unauthorized()

  const { data, error } = await parseBody(req, createTemplateSchema)
  if (error) return error

  const count = await prisma.questionnaireTemplate.count()
  if (count >= MAX_TEMPLATES) {
    return jsonError(
      `You've reached the limit of ${MAX_TEMPLATES} saved templates. Delete one before saving another.`,
      400
    )
  }

  const template = await prisma.questionnaireTemplate.create({
    data: {
      name: data.name,
      questions: data.questions,
      createdById: session.user.id,
    },
  })
  return NextResponse.json(template, { status: 201 })
}

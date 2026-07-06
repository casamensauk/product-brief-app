import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { jsonError, notFound, parseBody, unauthorized } from "@/lib/api"
import { updateBriefSchema } from "@/lib/schemas"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: Request, { params }: Params) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const brief = await prisma.projectBrief.findUnique({ where: { id } })
  if (!brief) return notFound()
  return NextResponse.json(brief)
}

export async function PATCH(req: Request, { params }: Params) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const { data, error } = await parseBody(req, updateBriefSchema)
  if (error) return error

  const existing = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return notFound()

  if (Object.keys(data).length === 0) {
    return jsonError("No editable fields provided", 400)
  }

  const brief = await prisma.projectBrief.update({
    where: { id },
    data: {
      ...(data.clientName !== undefined && { clientName: data.clientName }),
      ...(data.projectName !== undefined && { projectName: data.projectName || null }),
      ...(data.contactEmail !== undefined && { contactEmail: data.contactEmail || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.questions !== undefined && { questions: data.questions }),
    },
  })
  return NextResponse.json(brief)
}

export async function DELETE(req: Request, { params }: Params) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const existing = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return notFound()

  await prisma.projectBrief.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

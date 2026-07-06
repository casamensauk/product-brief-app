import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { notFound, parseBody, unauthorized } from "@/lib/api"
import { productBriefSchema } from "@/lib/schemas"

// Manual edits to the generated brief. Does NOT snapshot a version — only
// AI regeneration and restore do (those overwrite work; manual edits are the
// work).
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const { data, error } = await parseBody(
    req,
    z.object({ generatedBrief: productBriefSchema })
  )
  if (error) return error

  const existing = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!existing) return notFound()

  const updated = await prisma.projectBrief.update({
    where: { id },
    data: { generatedBrief: data.generatedBrief },
  })
  return NextResponse.json(updated)
}

import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { notFound, unauthorized } from "@/lib/api"
import { snapshotBriefVersion } from "@/lib/versions"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  if (!(await requireSession(req))) return unauthorized()
  const { id, versionId } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { id },
    select: { id: true, generatedBrief: true },
  })
  if (!brief) return notFound()

  const version = await prisma.briefVersion.findUnique({
    where: { id: versionId },
    select: { briefId: true, content: true },
  })
  if (!version || version.briefId !== id) return notFound()

  // Snapshot what we're about to overwrite, so a restore is itself reversible.
  await snapshotBriefVersion(id, brief.generatedBrief, "Before restoring")

  const updated = await prisma.projectBrief.update({
    where: { id },
    data: { generatedBrief: version.content as Prisma.InputJsonValue },
  })
  return NextResponse.json(updated)
}

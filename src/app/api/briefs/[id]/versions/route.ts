import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { unauthorized } from "@/lib/api"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireSession(req))) return unauthorized()
  const { id } = await params

  const versions = await prisma.briefVersion.findMany({
    where: { briefId: id },
    orderBy: { createdAt: "desc" },
    select: { id: true, label: true, createdAt: true },
  })
  return NextResponse.json(versions)
}

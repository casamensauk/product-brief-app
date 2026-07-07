import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireSession } from "@/lib/session"
import { parseBody, unauthorized } from "@/lib/api"
import { updateSettingsSchema } from "@/lib/schemas"
import { getSettings } from "@/lib/settings"

export async function GET(req: Request) {
  if (!(await requireSession(req))) return unauthorized()
  return NextResponse.json(await getSettings())
}

export async function PATCH(req: Request) {
  if (!(await requireSession(req))) return unauthorized()

  const { data, error } = await parseBody(req, updateSettingsSchema)
  if (error) return error

  const logoUrl = data.logoUrl?.trim() || null
  const settings = await prisma.workspaceSettings.upsert({
    where: { id: "default" },
    create: { id: "default", agencyName: data.agencyName, logoUrl },
    update: { agencyName: data.agencyName, logoUrl },
    select: { agencyName: true, logoUrl: true },
  })
  return NextResponse.json(settings)
}

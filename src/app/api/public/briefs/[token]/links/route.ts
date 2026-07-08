import { NextResponse } from "next/server"
import * as z from "zod"
import { prisma } from "@/lib/prisma"
import { jsonError, notFound, parseBody, tooManyRequests } from "@/lib/api"
import { clientLinksSchema } from "@/lib/schemas"
import { checkRateLimit, clientIp } from "@/lib/rate-limit"

// Public endpoint: the unguessable share token is the capability. It only
// accepts reference links — nothing else on the brief can be written.
export async function PUT(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const limit = checkRateLimit(`links:${clientIp(req)}:${token}`, {
    windowMs: 60_000,
    max: 20,
  })
  if (!limit.allowed) return tooManyRequests(limit.retryAfter)

  const { data, error } = await parseBody(req, z.object({ links: clientLinksSchema }))
  if (error) return error

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: { id: true, status: true },
  })
  if (!brief) return notFound()

  if (brief.status !== "DRAFT") {
    return jsonError("This questionnaire has already been submitted", 409)
  }

  await prisma.projectBrief.update({
    where: { shareToken: token },
    data: { clientLinks: data.links },
  })
  return NextResponse.json({ ok: true })
}

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export const MAX_VERSIONS_PER_BRIEF = 20

/**
 * Snapshot the current generated brief before it is overwritten, then prune
 * to the newest MAX_VERSIONS_PER_BRIEF. No-op when there is nothing to snapshot.
 */
export async function snapshotBriefVersion(
  briefId: string,
  content: Prisma.InputJsonValue | null | undefined,
  label: string
): Promise<void> {
  if (content == null) return

  await prisma.briefVersion.create({
    data: { briefId, content, label },
  })

  // Prune anything older than the newest N.
  const survivors = await prisma.briefVersion.findMany({
    where: { briefId },
    orderBy: { createdAt: "desc" },
    take: MAX_VERSIONS_PER_BRIEF,
    select: { id: true },
  })
  await prisma.briefVersion.deleteMany({
    where: { briefId, id: { notIn: survivors.map((v) => v.id) } },
  })
}

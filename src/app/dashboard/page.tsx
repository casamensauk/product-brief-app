import { prisma } from "@/lib/prisma"
import { BriefsList, type BriefListItem } from "@/components/briefs-list"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const briefs = await prisma.projectBrief.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      clientName: true,
      projectName: true,
      shareToken: true,
      status: true,
      submittedAt: true,
      updatedAt: true,
    },
  })

  return (
    <BriefsList
      briefs={briefs.map(
        (b): BriefListItem => ({
          ...b,
          submittedAt: b.submittedAt?.toISOString() ?? null,
          updatedAt: b.updatedAt.toISOString(),
        })
      )}
    />
  )
}

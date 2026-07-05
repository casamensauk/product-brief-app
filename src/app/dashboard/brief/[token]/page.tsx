import DeveloperBriefEditor from "@/components/developer-brief-editor"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function BriefReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token }
  })

  if (!brief) {
    notFound()
  }

  return <DeveloperBriefEditor brief={brief} />
}

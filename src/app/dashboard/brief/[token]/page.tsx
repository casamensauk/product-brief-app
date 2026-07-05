import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { answersSchema, productBriefSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import { BriefWorkspace, type BriefData } from "@/components/brief-workspace"

export const dynamic = "force-dynamic"

export default async function BriefPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
  })
  if (!brief) notFound()

  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)
  const briefResult = productBriefSchema.safeParse(brief.generatedBrief)

  const data: BriefData = {
    id: brief.id,
    clientName: brief.clientName,
    projectName: brief.projectName,
    contactEmail: brief.contactEmail,
    shareToken: brief.shareToken,
    status: brief.status,
    questions: parseQuestions(brief.questions),
    answers: answersResult.success ? answersResult.data : {},
    generatedBrief: brief.generatedBrief ? (briefResult.success ? briefResult.data : null) : null,
    submittedAt: brief.submittedAt?.toISOString() ?? null,
    createdAt: brief.createdAt.toISOString(),
    updatedAt: brief.updatedAt.toISOString(),
  }

  return <BriefWorkspace initialBrief={data} />
}

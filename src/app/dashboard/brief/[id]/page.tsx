import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { answersSchema, clientLinksSchema, productBriefSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import { emailConfigured } from "@/lib/email"
import { BriefWorkspace, type BriefData } from "@/components/brief-workspace"

export const dynamic = "force-dynamic"

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { id },
    include: {
      attachments: {
        select: { id: true, filename: true, mimeType: true, size: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!brief) notFound()

  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)
  const briefResult = productBriefSchema.safeParse(brief.generatedBrief)
  const clientLinksResult = clientLinksSchema.safeParse(brief.clientLinks)

  const data: BriefData = {
    id: brief.id,
    clientName: brief.clientName,
    projectName: brief.projectName,
    contactEmail: brief.contactEmail,
    shareToken: brief.shareToken,
    briefShareToken: brief.briefShareToken,
    status: brief.status,
    mode: brief.mode,
    clientLinks: clientLinksResult.success ? clientLinksResult.data : [],
    questions: parseQuestions(brief.questions),
    answers: answersResult.success ? answersResult.data : {},
    generatedBrief: brief.generatedBrief ? (briefResult.success ? briefResult.data : null) : null,
    attachments: brief.attachments.map((a) => ({
      id: a.id,
      filename: a.filename,
      mimeType: a.mimeType,
      size: a.size,
      createdAt: a.createdAt.toISOString(),
    })),
    submittedAt: brief.submittedAt?.toISOString() ?? null,
    createdAt: brief.createdAt.toISOString(),
    updatedAt: brief.updatedAt.toISOString(),
  }

  return <BriefWorkspace initialBrief={data} emailEnabled={emailConfigured()} />
}

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { answersSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import { getSettings } from "@/lib/settings"
import { ClientQuestionnaire } from "@/components/client-questionnaire"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Project questionnaire",
  robots: { index: false, follow: false },
}

export default async function QuestionnairePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token },
    select: {
      clientName: true,
      projectName: true,
      status: true,
      questions: true,
      rawClientAnswers: true,
      attachments: {
        select: { id: true, filename: true, mimeType: true, size: true },
        orderBy: { createdAt: "asc" },
      },
    },
  })
  if (!brief) notFound()

  const questions = parseQuestions(brief.questions)
  if (questions.length === 0) notFound()

  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)
  const settings = await getSettings()

  return (
    <ClientQuestionnaire
      token={token}
      projectName={brief.projectName}
      questions={questions}
      initialAnswers={answersResult.success ? answersResult.data : {}}
      alreadySubmitted={brief.status !== "DRAFT"}
      initialAttachments={brief.attachments}
      agencyName={settings.agencyName}
      logoUrl={settings.logoUrl}
    />
  )
}

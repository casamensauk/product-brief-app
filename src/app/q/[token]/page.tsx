import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { answersSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
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
    },
  })
  if (!brief) notFound()

  const questions = parseQuestions(brief.questions)
  if (questions.length === 0) notFound()

  const answersResult = answersSchema.safeParse(brief.rawClientAnswers)

  return (
    <ClientQuestionnaire
      token={token}
      clientName={brief.clientName}
      projectName={brief.projectName}
      questions={questions}
      initialAnswers={answersResult.success ? answersResult.data : {}}
      alreadySubmitted={brief.status !== "DRAFT"}
    />
  )
}

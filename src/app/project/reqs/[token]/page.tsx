import { redirect } from "next/navigation"

// Questionnaire links used to live here; keep them working.
export default async function LegacyQuestionnaireRedirect({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  redirect(`/q/${token}`)
}

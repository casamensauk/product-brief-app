import { prisma } from "@/lib/prisma"
import { questionsSchema } from "@/lib/schemas"
import { TemplatesSettings, type TemplateListItem } from "@/components/templates-settings"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const templates = await prisma.questionnaireTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, questions: true, updatedAt: true },
  })

  const items: TemplateListItem[] = templates.map((t) => {
    const parsed = questionsSchema.safeParse(t.questions)
    return {
      id: t.id,
      name: t.name,
      questionCount: parsed.success ? parsed.data.length : 0,
      updatedAt: t.updatedAt.toISOString(),
    }
  })

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage saved questionnaire templates.
        </p>
      </div>
      <TemplatesSettings initialTemplates={items} />
    </div>
  )
}

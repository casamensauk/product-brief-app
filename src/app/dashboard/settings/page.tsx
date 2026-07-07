import { prisma } from "@/lib/prisma"
import { questionsSchema } from "@/lib/schemas"
import { getSettings } from "@/lib/settings"
import { BrandingSettings } from "@/components/branding-settings"
import { TemplatesSettings, type TemplateListItem } from "@/components/templates-settings"

export const dynamic = "force-dynamic"
export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  const [templates, settings] = await Promise.all([
    prisma.questionnaireTemplate.findMany({
      orderBy: { updatedAt: "desc" },
      select: { id: true, name: true, questions: true, updatedAt: true },
    }),
    getSettings(),
  ])

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
          Brand the client-facing pages and manage questionnaire templates.
        </p>
      </div>
      <BrandingSettings initialSettings={settings} />
      <TemplatesSettings initialTemplates={items} />
    </div>
  )
}

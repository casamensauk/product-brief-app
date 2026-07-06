"use client"
import { useState } from "react"
import { Download, FileText, Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { downloadMarkdown, productBriefToMarkdown } from "@/lib/markdown"
import { answersSchema, productBriefSchema } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { BriefData } from "@/components/brief-workspace"

export function ProductBriefView({
  brief,
  onGenerated,
}: {
  brief: BriefData
  onGenerated: (updated: BriefData) => void
}) {
  const [generating, setGenerating] = useState(false)

  const hasAnswers = brief.questions.some((q) => {
    const value = brief.answers[q.id]
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
  })

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/briefs/${brief.id}/generate`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate the brief")

      const parsedBrief = productBriefSchema.safeParse(data.generatedBrief)
      const parsedAnswers = answersSchema.safeParse(data.rawClientAnswers)
      onGenerated({
        ...brief,
        status: data.status,
        questions: parseQuestions(data.questions),
        answers: parsedAnswers.success ? parsedAnswers.data : brief.answers,
        generatedBrief: parsedBrief.success ? parsedBrief.data : null,
        updatedAt: data.updatedAt,
      })
      toast.success("Product brief generated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate the brief")
    } finally {
      setGenerating(false)
    }
  }

  const handleExport = () => {
    if (!brief.generatedBrief) return
    const markdown = productBriefToMarkdown({
      clientName: brief.clientName,
      projectName: brief.projectName,
      brief: brief.generatedBrief,
      questions: brief.questions,
      answers: brief.answers,
    })
    const slug = (brief.projectName || brief.clientName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    downloadMarkdown(`product-brief-${slug || "export"}.md`, markdown)
  }

  if (!brief.generatedBrief) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <FileText className="size-10 text-muted-foreground/50" />
        <h2 className="font-heading font-semibold">No product brief yet</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          {hasAnswers
            ? "Turn the client's answers into a structured product brief: requirements, scope, risks, user stories, and open questions."
            : "Once your client answers the questionnaire, you can generate a structured product brief from their responses."}
        </p>
        <Button className="mt-2" onClick={handleGenerate} disabled={!hasAnswers || generating}>
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating ? "Generating — this can take a minute…" : "Generate product brief"}
        </Button>
      </div>
    )
  }

  const b = brief.generatedBrief

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {generating ? "Regenerating…" : "Regenerate"}
        </Button>
        <Button onClick={handleExport}>
          <Download className="size-4" />
          Export Markdown
        </Button>
      </div>

      <Section title="Executive summary">
        <Prose text={b.executiveSummary} />
      </Section>

      <Section title="Problem statement">
        <Prose text={b.problemStatement} />
      </Section>

      {b.goals.length > 0 && (
        <Section title="Goals">
          <BulletList items={b.goals} />
        </Section>
      )}

      {b.targetUsers.length > 0 && (
        <Section title="Target users">
          <ul className="space-y-2 text-sm">
            {b.targetUsers.map((u, i) => (
              <li key={i}>
                <span className="font-medium">{u.persona}</span>
                <span className="text-muted-foreground"> — {u.description}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {b.stakeholders.length > 0 && (
        <Section title="Stakeholders">
          <ul className="space-y-2 text-sm">
            {b.stakeholders.map((s, i) => (
              <li key={i}>
                <span className="font-medium">{s.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  ({s.role}) — {s.interest}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {b.userStories.length > 0 && (
        <Section title="User stories">
          <BulletList items={b.userStories} />
        </Section>
      )}

      {b.requirements.length > 0 && (
        <Section title="Requirements">
          <div className="space-y-3">
            {b.requirements.map((r, i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="flex gap-1.5">
                    <Badge variant="outline">{r.category}</Badge>
                    <Badge
                      variant={
                        r.priority === "Must-have"
                          ? "destructive"
                          : r.priority === "Should-have"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {r.priority}
                    </Badge>
                  </span>
                </div>
                {r.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {(b.scope.inScope.length > 0 || b.scope.outOfScope.length > 0) && (
        <Section title="Scope">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-medium text-success">In scope</h4>
              <BulletList items={b.scope.inScope} className="mt-2" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-destructive">Out of scope</h4>
              <BulletList items={b.scope.outOfScope} className="mt-2" />
            </div>
          </div>
        </Section>
      )}

      {b.assumptions.length > 0 && (
        <Section title="Assumptions">
          <BulletList items={b.assumptions} />
        </Section>
      )}

      {b.risks.length > 0 && (
        <Section title="Risks">
          <ul className="space-y-2 text-sm">
            {b.risks.map((r, i) => (
              <li key={i} className="rounded-lg border p-3">
                <span className="font-medium">{r.risk}</span>
                {r.mitigation && (
                  <p className="mt-1 text-muted-foreground">
                    Mitigation: {r.mitigation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {b.openQuestions.length > 0 && (
        <Section title="Open questions for the client">
          <BulletList items={b.openQuestions} />
        </Section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {b.timeline && (
          <Section title="Timeline">
            <Prose text={b.timeline} />
          </Section>
        )}
        {b.budget && (
          <Section title="Budget">
            <Prose text={b.budget} />
          </Section>
        )}
      </div>

      {b.successMetrics.length > 0 && (
        <Section title="Success metrics">
          <BulletList items={b.successMetrics} />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="font-heading font-semibold">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Prose({ text }: { text: string }) {
  return <p className="text-sm whitespace-pre-wrap">{text || "—"}</p>
}

function BulletList({ items, className }: { items: string[]; className?: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">—</p>
  return (
    <ul className={`list-disc space-y-1.5 pl-5 text-sm ${className ?? ""}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

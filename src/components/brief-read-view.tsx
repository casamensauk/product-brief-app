import type { ProductBrief } from "@/lib/schemas"
import {
  BRIEF_SECTIONS,
  type BriefSection,
} from "@/lib/brief-sections"
import { Badge } from "@/components/ui/badge"

// Read-only rendering of the product brief, shared by the editable workroom
// (ProductBriefView) and the public share page. Pure — no client hooks.

export function ProductBriefRead({ brief }: { brief: ProductBrief }) {
  return (
    <div className="space-y-6">
      {BRIEF_SECTIONS.map((section) => (
        <section key={section.key} className="rounded-xl border bg-card p-5">
          <h3 className="font-heading font-semibold">{section.label}</h3>
          <div className="mt-3">
            <SectionReadView section={section} brief={brief} />
          </div>
        </section>
      ))}
    </div>
  )
}

export function SectionReadView({
  section,
  brief,
}: {
  section: BriefSection
  brief: ProductBrief
}) {
  switch (section.kind) {
    case "string":
      return <Prose text={brief[section.key] as string} />
    case "stringList":
      return <BulletList items={brief[section.key] as string[]} />
    case "scope":
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="text-sm font-medium text-success">In scope</h4>
            <BulletList items={brief.scope.inScope} className="mt-2" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-destructive">Out of scope</h4>
            <BulletList items={brief.scope.outOfScope} className="mt-2" />
          </div>
        </div>
      )
    case "targetUsers":
      return brief.targetUsers.length ? (
        <ul className="space-y-2 text-sm">
          {brief.targetUsers.map((u, i) => (
            <li key={i}>
              <span className="font-medium">{u.persona}</span>
              <span className="text-muted-foreground"> — {u.description}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      )
    case "stakeholders":
      return brief.stakeholders.length ? (
        <ul className="space-y-2 text-sm">
          {brief.stakeholders.map((s, i) => (
            <li key={i}>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">
                {" "}
                ({s.role}) — {s.interest}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      )
    case "risks":
      return brief.risks.length ? (
        <ul className="space-y-2 text-sm">
          {brief.risks.map((r, i) => (
            <li key={i} className="rounded-lg border p-3">
              <span className="font-medium">{r.risk}</span>
              {r.mitigation && (
                <p className="mt-1 text-muted-foreground">Mitigation: {r.mitigation}</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty />
      )
    case "requirements":
      return brief.requirements.length ? (
        <div className="space-y-3">
          {brief.requirements.map((r, i) => (
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
      ) : (
        <Empty />
      )
  }
}

export function Prose({ text }: { text: string }) {
  return <p className="text-sm whitespace-pre-wrap">{text || "—"}</p>
}

export function Empty() {
  return <p className="text-sm text-muted-foreground">—</p>
}

export function BulletList({ items, className }: { items: string[]; className?: string }) {
  if (!items || items.length === 0) return <Empty />
  return (
    <ul className={`list-disc space-y-1.5 pl-5 text-sm ${className ?? ""}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

"use client"
import { useState } from "react"
import {
  Check,
  Download,
  FileText,
  History,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { downloadMarkdown, productBriefToMarkdown } from "@/lib/markdown"
import { answersSchema, productBriefSchema, type ProductBrief } from "@/lib/schemas"
import { parseQuestions } from "@/lib/answers"
import {
  BRIEF_SECTIONS,
  sectionLabel,
  type BriefSection,
  type BriefSectionKey,
} from "@/lib/brief-sections"
import { runBriefGeneration } from "@/lib/brief-stream-client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BriefData } from "@/components/brief-workspace"

// Shape returned by /generate (done event), /brief, /generate-section, and
// /versions/[id]/restore — a full ProjectBrief row serialised to JSON.
type BriefUpdateResponse = {
  status: BriefData["status"]
  questions: unknown
  rawClientAnswers: unknown
  generatedBrief: unknown
  updatedAt: string
}

const REQUIREMENT_CATEGORIES = [
  "Functional",
  "Non-functional",
  "Technical",
  "Operational",
  "Transitional",
]
const REQUIREMENT_PRIORITIES = ["Must-have", "Should-have", "Nice-to-have"]

export function ProductBriefView({
  brief,
  onGenerated,
}: {
  brief: BriefData
  onGenerated: (updated: BriefData) => void
}) {
  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState<Set<string>>(new Set())

  const hasAnswers = brief.questions.some((q) => {
    const value = brief.answers[q.id]
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
  })

  const applyUpdate = (data: BriefUpdateResponse) => {
    const parsedBrief = productBriefSchema.safeParse(data.generatedBrief)
    const parsedAnswers = answersSchema.safeParse(data.rawClientAnswers)
    onGenerated({
      ...brief,
      status: data.status,
      questions: parseQuestions(data.questions),
      answers: parsedAnswers.success ? parsedAnswers.data : brief.answers,
      generatedBrief: parsedBrief.success ? parsedBrief.data : brief.generatedBrief,
      updatedAt: data.updatedAt,
    })
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setProgress(new Set())
    await runBriefGeneration(brief.id, {
      onSection: (section) =>
        setProgress((prev) => new Set(prev).add(section)),
      onDone: (updated) => {
        applyUpdate(updated)
        toast.success("Product brief generated")
      },
      onError: (message) => toast.error(message),
    })
    setGenerating(false)
  }

  // Persist a single edited/regenerated section into the whole brief.
  const saveSection = async (key: BriefSectionKey, value: unknown): Promise<boolean> => {
    if (!brief.generatedBrief) return false
    const next = { ...brief.generatedBrief, [key]: value }
    try {
      const res = await fetch(`/api/briefs/${brief.id}/brief`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generatedBrief: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save changes")
      onGenerated({ ...brief, generatedBrief: next, updatedAt: data.updatedAt })
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
      return false
    }
  }

  const regenerateSection = async (key: BriefSectionKey): Promise<boolean> => {
    try {
      const res = await fetch(`/api/briefs/${brief.id}/generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: key }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to regenerate the section")
      const parsed = productBriefSchema.safeParse(data.generatedBrief)
      if (parsed.success) {
        onGenerated({ ...brief, generatedBrief: parsed.data, updatedAt: data.updatedAt })
      }
      toast.success(`Regenerated ${sectionLabel(key)}`)
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to regenerate the section")
      return false
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

  if (generating && !brief.generatedBrief) {
    return <GenerationProgress progress={progress} />
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
          <Sparkles className="size-4" />
          Generate product brief
        </Button>
      </div>
    )
  }

  const b = brief.generatedBrief

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <HistoryMenu
          briefId={brief.id}
          onRestored={(updated) => {
            applyUpdate(updated)
            toast.success("Restored an earlier version")
          }}
        />
        <Button variant="outline" onClick={handleGenerate} disabled={generating}>
          {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {generating ? "Regenerating…" : "Regenerate all"}
        </Button>
        <Button onClick={handleExport}>
          <Download className="size-4" />
          Export Markdown
        </Button>
      </div>

      {generating && <GenerationProgress progress={progress} compact />}

      {BRIEF_SECTIONS.map((section) => (
        <BriefSectionCard
          key={section.key}
          section={section}
          brief={b}
          onSave={(value) => saveSection(section.key, value)}
          onRegenerate={() => regenerateSection(section.key)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section card (read / edit + regenerate)
// ---------------------------------------------------------------------------

function BriefSectionCard({
  section,
  brief,
  onSave,
  onRegenerate,
}: {
  section: BriefSection
  brief: ProductBrief
  onSave: (value: unknown) => Promise<boolean>
  onRegenerate: () => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [draft, setDraft] = useState<unknown>(brief[section.key])

  const startEdit = () => {
    setDraft(structuredClone(brief[section.key]))
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave(sanitizeDraft(section, draft))
    setSaving(false)
    if (ok) setEditing(false)
  }

  const handleRegenerate = async () => {
    setRegenerating(true)
    await onRegenerate()
    setRegenerating(false)
  }

  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-heading font-semibold">{section.label}</h3>
        {!editing && (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Regenerate ${section.label} with AI`}
              disabled={regenerating}
              onClick={handleRegenerate}
            >
              {regenerating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${section.label}`}
              onClick={startEdit}
            >
              <Pencil className="size-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3">
        {editing ? (
          <div className="space-y-3">
            <SectionEditor section={section} value={draft} onChange={setDraft} />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        ) : (
          <SectionReadView section={section} brief={brief} />
        )}
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Read views
// ---------------------------------------------------------------------------

function SectionReadView({ section, brief }: { section: BriefSection; brief: ProductBrief }) {
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

// ---------------------------------------------------------------------------
// Editors
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  value,
  onChange,
}: {
  section: BriefSection
  value: unknown
  onChange: (next: unknown) => void
}) {
  switch (section.kind) {
    case "string":
      return (
        <Textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[100px]"
          aria-label={section.label}
        />
      )
    case "stringList":
      return (
        <ListTextarea value={(value as string[]) ?? []} onChange={onChange} label={section.label} />
      )
    case "scope": {
      const scope = (value as ProductBrief["scope"]) ?? { inScope: [], outOfScope: [] }
      return (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-sm font-medium text-success">In scope</p>
            <ListTextarea
              value={scope.inScope}
              onChange={(v) => onChange({ ...scope, inScope: v })}
              label="In scope"
            />
          </div>
          <div>
            <p className="mb-1.5 text-sm font-medium text-destructive">Out of scope</p>
            <ListTextarea
              value={scope.outOfScope}
              onChange={(v) => onChange({ ...scope, outOfScope: v })}
              label="Out of scope"
            />
          </div>
        </div>
      )
    }
    case "targetUsers":
      return (
        <StructuredListEditor
          items={value as Record<string, string>[]}
          onChange={onChange}
          blank={{ persona: "", description: "" }}
          fields={[
            { key: "persona", label: "Persona", type: "input" },
            { key: "description", label: "Description", type: "textarea" },
          ]}
        />
      )
    case "stakeholders":
      return (
        <StructuredListEditor
          items={value as Record<string, string>[]}
          onChange={onChange}
          blank={{ name: "", role: "", interest: "" }}
          fields={[
            { key: "name", label: "Name", type: "input" },
            { key: "role", label: "Role", type: "input" },
            { key: "interest", label: "Interest", type: "input" },
          ]}
        />
      )
    case "risks":
      return (
        <StructuredListEditor
          items={value as Record<string, string>[]}
          onChange={onChange}
          blank={{ risk: "", mitigation: "" }}
          fields={[
            { key: "risk", label: "Risk", type: "input" },
            { key: "mitigation", label: "Mitigation", type: "textarea" },
          ]}
        />
      )
    case "requirements":
      return (
        <StructuredListEditor
          items={value as Record<string, string>[]}
          onChange={onChange}
          blank={{
            name: "",
            description: "",
            category: "Functional",
            priority: "Should-have",
          }}
          fields={[
            { key: "name", label: "Name", type: "input" },
            { key: "description", label: "Description", type: "textarea" },
            { key: "category", label: "Category", type: "select", options: REQUIREMENT_CATEGORIES },
            { key: "priority", label: "Priority", type: "select", options: REQUIREMENT_PRIORITIES },
          ]}
        />
      )
  }
}

function ListTextarea({
  value,
  onChange,
  label,
}: {
  value: string[]
  onChange: (next: string[]) => void
  label: string
}) {
  return (
    <div className="space-y-1">
      <Textarea
        value={value.join("\n")}
        onChange={(e) => onChange(e.target.value.split("\n"))}
        className="min-h-[100px]"
        aria-label={label}
      />
      <p className="text-xs text-muted-foreground">One item per line.</p>
    </div>
  )
}

type FieldConfig = {
  key: string
  label: string
  type: "input" | "textarea" | "select"
  options?: string[]
}

function StructuredListEditor({
  items,
  fields,
  blank,
  onChange,
}: {
  items: Record<string, string>[]
  fields: FieldConfig[]
  blank: Record<string, string>
  onChange: (next: Record<string, string>[]) => void
}) {
  const rows = Array.isArray(items) ? items : []

  const update = (index: number, key: string, val: string) =>
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: val } : row)))

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Item {i + 1}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove item ${i + 1}`}
              className="text-destructive hover:text-destructive"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
          <div className="mt-2 grid gap-2">
            {fields.map((field) => (
              <div key={field.key} className="grid gap-1">
                <label className="text-xs text-muted-foreground">{field.label}</label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={row[field.key] ?? ""}
                    onChange={(e) => update(i, field.key, e.target.value)}
                    className="min-h-[60px]"
                  />
                ) : field.type === "select" ? (
                  <Select
                    value={row[field.key] ?? field.options?.[0] ?? ""}
                    onValueChange={(v) => update(i, field.key, v as string)}
                    items={Object.fromEntries((field.options ?? []).map((o) => [o, o]))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={row[field.key] ?? ""}
                    onChange={(e) => update(i, field.key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-full border-dashed"
        onClick={() => onChange([...rows, { ...blank }])}
      >
        <Plus className="size-4" />
        Add item
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

type VersionMeta = { id: string; label: string; createdAt: string }

function HistoryMenu({
  briefId,
  onRestored,
}: {
  briefId: string
  onRestored: (updated: BriefUpdateResponse) => void
}) {
  const [versions, setVersions] = useState<VersionMeta[]>([])
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState<VersionMeta | null>(null)
  const [restoring, setRestoring] = useState(false)

  const loadVersions = async (open: boolean) => {
    if (!open) return
    setLoading(true)
    try {
      const res = await fetch(`/api/briefs/${briefId}/versions`)
      const data = await res.json()
      setVersions(Array.isArray(data) ? data : [])
    } catch {
      setVersions([])
    } finally {
      setLoading(false)
    }
  }

  const restore = async () => {
    if (!confirming) return
    setRestoring(true)
    try {
      const res = await fetch(`/api/briefs/${briefId}/versions/${confirming.id}/restore`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to restore")
      onRestored(data)
      setConfirming(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore")
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <DropdownMenu onOpenChange={loadVersions}>
        <DropdownMenuTrigger
          render={
            <Button variant="outline">
              <History className="size-4" />
              History
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="min-w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Version history</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          {loading ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">Loading…</div>
          ) : versions.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              No earlier versions yet. They&apos;re saved automatically before
              each regeneration.
            </div>
          ) : (
            versions.map((v) => (
              <DropdownMenuItem
                key={v.id}
                onClick={() => setConfirming(v)}
                className="flex-col items-start gap-0.5"
              >
                <span className="font-medium">{v.label}</span>
                <span className="text-xs text-muted-foreground" suppressHydrationWarning>
                  {new Date(v.createdAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={Boolean(confirming)} onOpenChange={(o) => !o && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore this version?</DialogTitle>
            <DialogDescription>
              The current brief will be replaced with this snapshot. Your current
              version is saved to history first, so you can undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={restoring}>
              Cancel
            </Button>
            <Button onClick={restore} disabled={restoring}>
              {restoring && <Loader2 className="size-4 animate-spin" />}
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function GenerationProgress({
  progress,
  compact,
}: {
  progress: Set<string>
  compact?: boolean
}) {
  return (
    <div
      className={
        compact
          ? "rounded-xl border bg-card p-4"
          : "flex flex-col gap-4 rounded-xl border bg-card px-6 py-10"
      }
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="size-4 animate-spin text-primary" />
        Generating the product brief…
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {BRIEF_SECTIONS.map((section) => {
          const done = progress.has(section.key)
          return (
            <li
              key={section.key}
              className={`flex items-center gap-2 text-sm ${done ? "text-foreground" : "text-muted-foreground"}`}
            >
              {done ? (
                <Check className="size-4 text-success" />
              ) : (
                <span className="size-4 shrink-0 rounded-full border" />
              )}
              {section.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Drop blank list items / scope entries / fully-empty structured rows that a
// user leaves behind (e.g. a trailing newline in a one-item-per-line editor)
// so they don't persist as empty bullets.
function sanitizeDraft(section: BriefSection, draft: unknown): unknown {
  const cleanList = (items: unknown) =>
    (Array.isArray(items) ? items : [])
      .map((v) => (typeof v === "string" ? v.trim() : v))
      .filter(Boolean)

  switch (section.kind) {
    case "stringList":
      return cleanList(draft)
    case "scope": {
      const scope = (draft as ProductBrief["scope"]) ?? { inScope: [], outOfScope: [] }
      return {
        inScope: cleanList(scope.inScope),
        outOfScope: cleanList(scope.outOfScope),
      }
    }
    case "targetUsers":
    case "stakeholders":
    case "risks":
    case "requirements":
      return (Array.isArray(draft) ? (draft as Record<string, string>[]) : []).filter((row) =>
        Object.values(row).some((v) => typeof v === "string" && v.trim() !== "")
      )
    default:
      return draft
  }
}

function Prose({ text }: { text: string }) {
  return <p className="text-sm whitespace-pre-wrap">{text || "—"}</p>
}

function Empty() {
  return <p className="text-sm text-muted-foreground">—</p>
}

function BulletList({ items, className }: { items: string[]; className?: string }) {
  if (!items || items.length === 0) return <Empty />
  return (
    <ul className={`list-disc space-y-1.5 pl-5 text-sm ${className ?? ""}`}>
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

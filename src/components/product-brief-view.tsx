"use client"
import { useState } from "react"
import {
  Check,
  Download,
  FileText,
  History,
  LinkIcon,
  Loader2,
  MessageCircleQuestion,
  Pencil,
  Plus,
  RefreshCw,
  Share2,
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
import { useOrigin } from "@/lib/share"
import { SectionReadView } from "@/components/brief-read-view"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
  DialogTrigger,
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
        {b.openQuestions.length > 0 && (
          <FollowUpDialog
            briefId={brief.id}
            openQuestions={b.openQuestions}
            onDone={(updated, emailed) => {
              applyUpdate(updated)
              toast.success(
                emailed
                  ? "Questionnaire reopened and emailed to the client"
                  : "Questionnaire reopened — copy the link to send it"
              )
            }}
          />
        )}
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
        <ShareBriefDialog briefId={brief.id} initialToken={brief.briefShareToken} />
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
// Follow-up questions
// ---------------------------------------------------------------------------

function FollowUpDialog({
  briefId,
  openQuestions,
  onDone,
}: {
  briefId: string
  openQuestions: string[]
  onDone: (updated: BriefUpdateResponse, emailed: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<{ text: string; checked: boolean }[]>([])
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (next) setRows(openQuestions.map((q) => ({ text: q, checked: true })))
    setOpen(next)
  }

  const selected = rows.filter((r) => r.checked && r.text.trim())

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/briefs/${briefId}/follow-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: selected.map((r) => r.text.trim()) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send follow-up questions")
      onDone(data, Boolean(data.emailed))
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send follow-up questions")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <MessageCircleQuestion className="size-4" />
            Send follow-up questions
          </Button>
        }
      />
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send follow-up questions</DialogTitle>
          <DialogDescription>
            Pick which open questions to ask the client. This reopens their
            questionnaire and, if a contact email is set, emails them the link.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          {rows.map((row, i) => (
            <div key={i} className="flex items-start gap-2">
              <Checkbox
                checked={row.checked}
                onCheckedChange={(c) =>
                  setRows((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, checked: c === true } : r))
                  )
                }
                className="mt-2.5"
                aria-label={`Include question ${i + 1}`}
              />
              <Textarea
                value={row.text}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r, j) => (j === i ? { ...r, text: e.target.value } : r))
                  )
                }
                className="min-h-[52px]"
                maxLength={500}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || selected.length === 0}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Reopen questionnaire
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Share (public read-only link)
// ---------------------------------------------------------------------------

function ShareBriefDialog({
  briefId,
  initialToken,
}: {
  briefId: string
  initialToken: string | null
}) {
  const [open, setOpen] = useState(false)
  const [token, setToken] = useState(initialToken)
  const [working, setWorking] = useState(false)
  const [copied, setCopied] = useState(false)
  const origin = useOrigin()

  const url = token ? `${origin}/brief/${token}` : ""

  const act = async (action: "enable" | "rotate" | "disable") => {
    setWorking(true)
    try {
      const res = await fetch(`/api/briefs/${briefId}/share-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Something went wrong")
      setToken(data.briefShareToken)
      toast.success(
        action === "disable"
          ? "Sharing disabled"
          : action === "rotate"
            ? "New share link generated — the old one no longer works"
            : "Share link created"
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setWorking(false)
    }
  }

  const copy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Share2 className="size-4" />
            Share brief
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this brief</DialogTitle>
          <DialogDescription>
            Create a private, read-only link to the product brief. Anyone with
            the link can view it — it isn&apos;t listed or searchable.
          </DialogDescription>
        </DialogHeader>

        {token ? (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border bg-muted/40 p-3">
              <div className="text-xs font-medium text-muted-foreground">
                Read-only brief link
              </div>
              <div className="truncate font-mono text-sm">{url}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copy}>
                {copied ? <Check className="size-4 text-success" /> : <LinkIcon className="size-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => act("rotate")} disabled={working}>
                {working ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Rotate
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => act("disable")}
                disabled={working}
              >
                Disable sharing
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-2">
            <Button onClick={() => act("enable")} disabled={working}>
              {working ? <Loader2 className="size-4 animate-spin" /> : <Share2 className="size-4" />}
              Create share link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
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

"use client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Check,
  LinkIcon,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import type { BriefStatus } from "@prisma/client"
import type { Answers, ProductBrief, Question } from "@/lib/schemas"
import { copyShareLink, useShareUrl } from "@/lib/share"
import { ALL_STATUSES, STATUS_BADGE_VARIANTS, STATUS_LABELS } from "@/lib/status"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { QuestionnaireBuilder } from "@/components/questionnaire-builder"
import { ResponsesView } from "@/components/responses-view"
import { ProductBriefView } from "@/components/product-brief-view"

export type BriefData = {
  id: string
  clientName: string
  projectName: string | null
  contactEmail: string | null
  shareToken: string
  status: BriefStatus
  questions: Question[]
  answers: Answers
  generatedBrief: ProductBrief | null
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

type Tab = "questionnaire" | "responses" | "brief"

const TABS: { id: Tab; label: string }[] = [
  { id: "questionnaire", label: "Questionnaire" },
  { id: "responses", label: "Responses" },
  { id: "brief", label: "Product brief" },
]

export function BriefWorkspace({ initialBrief }: { initialBrief: BriefData }) {
  const router = useRouter()
  const [brief, setBrief] = useState(initialBrief)
  const [tab, setTab] = useState<Tab>(
    initialBrief.status === "DRAFT"
      ? "questionnaire"
      : initialBrief.status === "SUBMITTED"
        ? "responses"
        : "brief"
  )
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [rotating, setRotating] = useState(false)
  const [rotateOpen, setRotateOpen] = useState(false)
  const clientUrl = useShareUrl(brief.shareToken)

  const patchBrief = async (
    fields: Partial<
      Pick<BriefData, "clientName" | "projectName" | "contactEmail" | "questions"> & {
        status: BriefStatus
      }
    >
  ): Promise<boolean> => {
    try {
      const res = await fetch(`/api/briefs/${brief.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save changes")
      setBrief((prev) => ({ ...prev, ...fields, updatedAt: data.updatedAt }))
      return true
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
      return false
    }
  }

  const handleRotate = async () => {
    setRotating(true)
    try {
      const res = await fetch(`/api/briefs/${brief.id}/rotate-link`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to rotate the link")
      setBrief((prev) => ({ ...prev, shareToken: data.shareToken }))
      setRotateOpen(false)
      toast.success("New client link generated — the old one no longer works")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to rotate the link")
    } finally {
      setRotating(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/briefs/${brief.id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete the session")
      }
      toast.success("Discovery session deleted")
      router.push("/dashboard")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the session")
      setDeleting(false)
    }
  }

  const handleCopy = async () => {
    await copyShareLink(brief.shareToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        All sessions
      </Link>

      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-2xl font-bold break-words">
              {brief.projectName || "Untitled project"}
            </h1>
            <Badge variant={STATUS_BADGE_VARIANTS[brief.status]}>
              {STATUS_LABELS[brief.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {brief.clientName}
            {brief.contactEmail ? ` · ${brief.contactEmail}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EditDetailsDialog brief={brief} onSave={patchBrief} />
          <Select
            value={brief.status}
            onValueChange={(v) => patchBrief({ status: v as BriefStatus })}
            items={STATUS_LABELS}
          >
            <SelectTrigger aria-label="Session status" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger
              render={
                <Button variant="destructive" size="icon" aria-label="Delete session">
                  <Trash2 className="size-4" />
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this discovery session?</DialogTitle>
                <DialogDescription>
                  The questionnaire, the client&apos;s answers, and the generated
                  brief will be permanently deleted. The client link will stop
                  working.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting && <Loader2 className="size-4 animate-spin" />}
                  Delete permanently
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-muted-foreground">
            Client questionnaire link
          </div>
          <div className="truncate font-mono text-sm">{clientUrl}</div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" onClick={handleCopy}>
            {copied ? <Check className="size-4 text-success" /> : <LinkIcon className="size-4" />}
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Dialog open={rotateOpen} onOpenChange={setRotateOpen}>
            <DialogTrigger
              render={
                <Button variant="outline" size="icon" aria-label="Rotate client link">
                  <RefreshCw className="size-4" />
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate a new client link?</DialogTitle>
                <DialogDescription>
                  The current link will stop working immediately. Use this if the
                  old link was shared with the wrong person. Any answers already
                  saved are kept.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRotateOpen(false)} disabled={rotating}>
                  Cancel
                </Button>
                <Button onClick={handleRotate} disabled={rotating}>
                  {rotating && <Loader2 className="size-4 animate-spin" />}
                  Generate new link
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div role="tablist" aria-label="Brief sections" className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "questionnaire" && (
        <QuestionnaireBuilder
          briefId={brief.id}
          initialQuestions={brief.questions}
          locked={brief.status !== "DRAFT"}
          onSave={async (questions) => {
            const ok = await patchBrief({ questions })
            if (ok) toast.success("Questionnaire saved")
            return ok
          }}
        />
      )}
      {tab === "responses" && (
        <ResponsesView brief={brief} onCopyLink={handleCopy} />
      )}
      {tab === "brief" && (
        <ProductBriefView brief={brief} onGenerated={(updated) => setBrief(updated)} />
      )}
    </div>
  )
}

function EditDetailsDialog({
  brief,
  onSave,
}: {
  brief: BriefData
  onSave: (fields: {
    clientName: string
    projectName: string | null
    contactEmail: string | null
  }) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientName, setClientName] = useState(brief.clientName)
  const [projectName, setProjectName] = useState(brief.projectName ?? "")
  const [contactEmail, setContactEmail] = useState(brief.contactEmail ?? "")

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setClientName(brief.clientName)
      setProjectName(brief.projectName ?? "")
      setContactEmail(brief.contactEmail ?? "")
    }
    setOpen(next)
  }

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave({
      clientName: clientName.trim(),
      projectName: projectName.trim() || null,
      contactEmail: contactEmail.trim() || null,
    })
    setSaving(false)
    if (ok) {
      toast.success("Details updated")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Pencil className="size-4" />
            Edit details
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="edit-clientName">Client name</Label>
            <Input
              id="edit-clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-projectName">Project name</Label>
            <Input
              id="edit-projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-contactEmail">Client contact email</Label>
            <Input
              id="edit-contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!clientName.trim() || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"
import { useState } from "react"
import { Loader2, ScrollText, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export type TemplateListItem = {
  id: string
  name: string
  questionCount: number
  updatedAt: string
}

export function TemplatesSettings({
  initialTemplates,
}: {
  initialTemplates: TemplateListItem[]
}) {
  const [templates, setTemplates] = useState(initialTemplates)

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete the template")
      }
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      toast.success("Template deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete the template")
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="font-heading font-semibold">Questionnaire templates</h2>
      {templates.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-card px-6 py-10 text-center">
          <ScrollText className="size-8 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No templates saved yet. Save one from a session&apos;s
            questionnaire tab to reuse it for future clients.
          </p>
        </div>
      ) : (
        <div className="divide-y rounded-xl border bg-card">
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} onDelete={() => handleDelete(t.id)} />
          ))}
        </div>
      )}
    </section>
  )
}

function TemplateRow({
  template,
  onDelete,
}: {
  template: TemplateListItem
  onDelete: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium">{template.name}</p>
        <p className="text-xs text-muted-foreground">
          {template.questionCount} question{template.questionCount === 1 ? "" : "s"} · Updated{" "}
          {new Date(template.updatedAt).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Delete template ${template.name}`}
              className="shrink-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this template?</DialogTitle>
            <DialogDescription>
              &ldquo;{template.name}&rdquo; will be permanently deleted. Sessions
              already created from it keep their own questions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={async () => {
                setDeleting(true)
                await onDelete()
                setDeleting(false)
                setOpen(false)
              }}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

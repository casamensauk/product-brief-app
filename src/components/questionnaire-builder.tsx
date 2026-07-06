"use client"
import { useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Lock,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import {
  questionsSchema,
  type Question,
  type QuestionType,
} from "@/lib/schemas"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const TYPE_LABELS: Record<QuestionType, string> = {
  short_text: "Short text",
  long_text: "Long text",
  single_select: "Single choice",
  multi_select: "Multiple choice",
}

function newQuestion(): Question {
  return {
    id: crypto.randomUUID(),
    label: "",
    type: "long_text",
    required: false,
  }
}

export function QuestionnaireBuilder({
  briefId,
  initialQuestions,
  locked,
  onSave,
}: {
  briefId: string
  initialQuestions: Question[]
  locked: boolean
  onSave: (questions: Question[]) => Promise<boolean>
}) {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  const update = (mutate: (draft: Question[]) => Question[]) => {
    setQuestions((prev) => mutate([...prev]))
    setDirty(true)
  }

  const updateQuestion = (id: string, fields: Partial<Question>) =>
    update((draft) => draft.map((q) => (q.id === id ? { ...q, ...fields } : q)))

  const move = (index: number, delta: -1 | 1) =>
    update((draft) => {
      const target = index + delta
      if (target < 0 || target >= draft.length) return draft
      const [item] = draft.splice(index, 1)
      draft.splice(target, 0, item)
      return draft
    })

  const handleSave = async () => {
    const trimmed = questions.map((q) => ({
      ...q,
      label: q.label.trim(),
      helpText: q.helpText?.trim() || undefined,
      placeholder: q.placeholder?.trim() || undefined,
      options:
        q.type === "single_select" || q.type === "multi_select"
          ? q.options?.map((o) => o.trim()).filter(Boolean)
          : undefined,
    }))
    const result = questionsSchema.safeParse(trimmed)
    if (!result.success) {
      const issue = result.error.issues[0]
      toast.error(
        issue.message === "Invalid input" || issue.message.startsWith("Too small")
          ? "Every question needs a label, and choice questions need at least two options."
          : issue.message
      )
      return
    }
    setSaving(true)
    const ok = await onSave(result.data)
    setSaving(false)
    if (ok) {
      setQuestions(result.data)
      setDirty(false)
    }
  }

  if (locked) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" />
          The questionnaire is locked because the client has already submitted
          answers. You can still review the questions below.
        </div>
        <div className="space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    Question {i + 1} · {TYPE_LABELS[q.type]}
                    {q.required ? " · Required" : ""}
                  </span>
                  <p className="mt-1 font-medium">{q.label}</p>
                  {q.helpText && (
                    <p className="mt-1 text-sm text-muted-foreground">{q.helpText}</p>
                  )}
                  {q.options && q.options.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Options: {q.options.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          These are the questions your client will answer. Reorder, edit, or
          let AI draft a questionnaire tailored to this project.
        </p>
        <div className="flex items-center gap-2">
          <SuggestQuestionsDialog
            briefId={briefId}
            onReplace={(next) => {
              setQuestions(next)
              setDirty(true)
              toast.success(
                `AI drafted ${next.length} questions — review and save to apply`
              )
            }}
          />
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save questionnaire
          </Button>
        </div>
      </div>

      {dirty && (
        <Badge variant="warning" className="border-warning/40">
          Unsaved changes
        </Badge>
      )}

      <div className="space-y-3">
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i}
            total={questions.length}
            question={q}
            onChange={(fields) => updateQuestion(q.id, fields)}
            onMove={(delta) => move(i, delta)}
            onRemove={() => update((draft) => draft.filter((d) => d.id !== q.id))}
          />
        ))}
      </div>

      <Button
        variant="outline"
        className="w-full border-dashed"
        onClick={() => update((draft) => [...draft, newQuestion()])}
      >
        <Plus className="size-4" />
        Add question
      </Button>
    </div>
  )
}

function QuestionCard({
  index,
  total,
  question,
  onChange,
  onMove,
  onRemove,
}: {
  index: number
  total: number
  question: Question
  onChange: (fields: Partial<Question>) => void
  onMove: (delta: -1 | 1) => void
  onRemove: () => void
}) {
  const isSelect =
    question.type === "single_select" || question.type === "multi_select"

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Question {index + 1}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Move down"
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Remove question"
            className="text-destructive hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3">
        <Input
          value={question.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="What do you want to ask the client?"
          aria-label={`Question ${index + 1} label`}
        />

        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={question.type}
            items={TYPE_LABELS}
            onValueChange={(v) => {
              const type = v as QuestionType
              onChange({
                type,
                options:
                  type === "single_select" || type === "multi_select"
                    ? (question.options ?? ["", ""])
                    : undefined,
              })
            }}
          >
            <SelectTrigger aria-label="Question type" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABELS) as QuestionType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={question.required}
              onCheckedChange={(checked) => onChange({ required: checked === true })}
            />
            Required
          </label>
        </div>

        <Input
          value={question.helpText ?? ""}
          onChange={(e) => onChange({ helpText: e.target.value })}
          placeholder="Help text shown under the question (optional)"
          aria-label={`Question ${index + 1} help text`}
        />

        {!isSelect && (
          <Input
            value={question.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            placeholder="Example answer shown as a placeholder (optional)"
            aria-label={`Question ${index + 1} placeholder`}
          />
        )}

        {isSelect && (
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">
              Options — one per line
            </Label>
            <Textarea
              value={(question.options ?? []).join("\n")}
              onChange={(e) => onChange({ options: e.target.value.split("\n") })}
              placeholder={"Option A\nOption B"}
              className="min-h-[80px] font-mono text-sm"
              aria-label={`Question ${index + 1} options`}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function SuggestQuestionsDialog({
  briefId,
  onReplace,
}: {
  briefId: string
  onReplace: (questions: Question[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [instructions, setInstructions] = useState("")
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch(`/api/briefs/${briefId}/suggest-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to generate questions")
      onReplace(data.questions)
      setOpen(false)
      setInstructions("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate questions")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Sparkles className="size-4 text-primary" />
            Draft with AI
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Draft questionnaire with AI</DialogTitle>
          <DialogDescription>
            AI drafts a discovery questionnaire tailored to this client and
            project. It replaces the current questions — you can review and
            edit before saving.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="ai-instructions">
            Anything the AI should know? (optional)
          </Label>
          <Textarea
            id="ai-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. This is a mobile app for a gym chain. Focus on booking, memberships, and integrations with their existing systems."
            className="min-h-[100px]"
            maxLength={2000}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={generating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {generating ? "Drafting…" : "Draft questions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

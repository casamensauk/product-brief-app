"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  File as FileIcon,
  FileText,
  Loader2,
  Paperclip,
  Pencil,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { Answers, Question } from "@/lib/schemas"
import {
  ACCEPT_ATTR,
  MAX_ATTACHMENTS_PER_BRIEF,
  MAX_ATTACHMENT_SIZE,
  formatFileSize,
} from "@/lib/attachments"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

type SaveState = "idle" | "saving" | "saved" | "error"

export type AttachmentMeta = {
  id: string
  filename: string
  mimeType: string
  size: number
}

// Steps: 0 = intro, 1..N = questions, N+1 = review
export function ClientQuestionnaire({
  token,
  clientName,
  projectName,
  questions,
  initialAnswers,
  alreadySubmitted,
  initialAttachments,
}: {
  token: string
  clientName: string
  projectName: string | null
  questions: Question[]
  initialAnswers: Answers
  alreadySubmitted: boolean
  initialAttachments: AttachmentMeta[]
}) {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadySubmitted)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<AttachmentMeta[]>(initialAttachments)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveAbort = useRef<AbortController | null>(null)

  const save = useCallback(
    async (toSave: Answers) => {
      // Cancel any in-flight save so a slow older request can't finish after
      // a newer one and report a stale result.
      saveAbort.current?.abort()
      const controller = new AbortController()
      saveAbort.current = controller

      setSaveState("saving")
      try {
        const res = await fetch(`/api/public/briefs/${token}/answers`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: toSave }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error()
        setSaveState("saved")
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return
        setSaveState("error")
      }
    },
    [token]
  )

  const setAnswer = (id: string, value: string | string[]) => {
    const next = { ...answers, [id]: value }
    setAnswers(next)
    setValidationError(null)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => save(next), 800)
  }

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  const totalSteps = questions.length
  const currentQuestion = step >= 1 && step <= totalSteps ? questions[step - 1] : null

  const isAnswered = useCallback(
    (q: Question) => {
      const value = answers[q.id]
      return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
    },
    [answers]
  )

  const answeredCount = useMemo(
    () => questions.filter(isAnswered).length,
    [questions, isAnswered]
  )

  const goNext = () => {
    if (currentQuestion?.required && !isAnswered(currentQuestion)) {
      setValidationError("This question is required.")
      return
    }
    setValidationError(null)
    setStep((s) => Math.min(s + 1, totalSteps + 1))
  }

  const handleSubmit = async () => {
    // A trailing autosave would 409 after submission; drop it.
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/briefs/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setSubmitted(true)
        return
      }
      if (!res.ok) throw new Error(data.error || "Could not submit — please try again.")
      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit — please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <Shell projectName={projectName} clientName={clientName}>
        <div className="flex flex-col items-center gap-4 rounded-xl border bg-card px-6 py-16 text-center shadow-sm">
          <CheckCircle2 className="size-12 text-success" />
          <h1 className="font-heading text-2xl font-bold">Thank you!</h1>
          <p className="max-w-md text-muted-foreground">
            Your answers have been submitted. We&apos;ll review everything and
            get back to you with the next steps — no further action is needed.
          </p>
        </div>
      </Shell>
    )
  }

  if (step === 0) {
    return (
      <Shell projectName={projectName} clientName={clientName}>
        <div className="rounded-xl border bg-card p-8 shadow-sm sm:p-10">
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            {projectName ? `Let's plan ${projectName}` : "Let's plan your project"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            Before we start building, we&apos;d like to understand your goals.
            This questionnaire has {questions.length} questions and takes about{" "}
            {Math.max(5, Math.ceil(questions.length * 1.5))} minutes.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" />
              Your answers save automatically as you type
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" />
              You can come back to this link anytime before submitting
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-4 text-success" />
              There are no wrong answers — plain language is perfect
            </li>
          </ul>
          <Button size="lg" className="mt-8" onClick={() => setStep(1)}>
            {answeredCount > 0 ? "Continue" : "Get started"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Shell>
    )
  }

  if (step > totalSteps) {
    return (
      <Shell projectName={projectName} clientName={clientName}>
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h1 className="font-heading text-xl font-bold">Review your answers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Check everything looks right, then submit. You won&apos;t be able
              to edit after submitting.
            </p>
          </div>

          {questions.map((q, i) => {
            const value = answers[q.id]
            const text = Array.isArray(value) ? value.join(", ") : value
            return (
              <div key={q.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {q.label}
                      {q.required && <span className="text-destructive"> *</span>}
                    </p>
                    {text?.trim() ? (
                      <p className="mt-1.5 text-sm whitespace-pre-wrap text-muted-foreground">
                        {text}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-sm text-muted-foreground italic">
                        Not answered
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit answer to: ${q.label}`}
                    onClick={() => setStep(i + 1)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                </div>
              </div>
            )
          })}

          <AttachmentsUpload
            token={token}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
          />

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(totalSteps)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              Submit answers
            </Button>
          </div>
        </div>
      </Shell>
    )
  }

  const q = currentQuestion!
  const progress = Math.round(((step - 1) / totalSteps) * 100)

  return (
    <Shell projectName={projectName} clientName={clientName} saveState={saveState}>
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {step} of {totalSteps}
          </span>
          <span>{progress}% complete</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="font-heading text-lg font-semibold sm:text-xl">
          {q.label}
          {q.required && <span className="text-destructive"> *</span>}
        </h2>
        {q.helpText && <p className="mt-2 text-sm text-muted-foreground">{q.helpText}</p>}

        <div className="mt-6">
          <QuestionInput question={q} value={answers[q.id]} onChange={setAnswer} />
        </div>

        {validationError && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {validationError}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button onClick={goNext}>
          {step === totalSteps ? "Review answers" : "Next"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </Shell>
  )
}

function Shell({
  projectName,
  clientName,
  saveState,
  children,
}: {
  projectName: string | null
  clientName: string
  saveState?: SaveState
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            <FileText className="size-4 shrink-0 text-primary" />
            <span className="truncate">
              {projectName || clientName} — Discovery questionnaire
            </span>
          </span>
          {saveState && saveState !== "idle" && (
            <span
              className={`shrink-0 text-xs ${saveState === "error" ? "text-destructive" : "text-muted-foreground"}`}
              aria-live="polite"
            >
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Couldn't save — check your connection"}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-10">{children}</main>
    </div>
  )
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string | string[] | undefined
  onChange: (id: string, value: string | string[]) => void
}) {
  switch (question.type) {
    case "short_text":
      return (
        <Input
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          placeholder={question.placeholder}
          aria-label={question.label}
          autoFocus
        />
      )
    case "long_text":
      return (
        <Textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(question.id, e.target.value)}
          placeholder={question.placeholder}
          className="min-h-[160px]"
          aria-label={question.label}
          autoFocus
        />
      )
    case "single_select":
      return (
        <RadioGroup
          value={typeof value === "string" ? value : ""}
          onValueChange={(v) => onChange(question.id, (v as string) ?? "")}
          className="gap-3"
        >
          {(question.options ?? []).map((option) => (
            <Label
              key={option}
              className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal transition-colors has-data-[checked]:border-primary has-data-[checked]:bg-primary/5 hover:bg-muted/50"
            >
              <RadioGroupItem value={option} />
              {option}
            </Label>
          ))}
        </RadioGroup>
      )
    case "multi_select": {
      const selected = Array.isArray(value) ? value : []
      return (
        <div className="flex flex-col gap-3">
          {(question.options ?? []).map((option) => {
            const checked = selected.includes(option)
            return (
              <Label
                key={option}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal transition-colors hover:bg-muted/50"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    onChange(
                      question.id,
                      next === true
                        ? [...selected, option]
                        : selected.filter((v) => v !== option)
                    )
                  }
                />
                {option}
              </Label>
            )
          })}
        </div>
      )
    }
  }
}

function AttachmentsUpload({
  token,
  attachments,
  onAttachmentsChange,
}: {
  token: string
  attachments: AttachmentMeta[]
  onAttachmentsChange: (next: AttachmentMeta[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)

    const remaining = MAX_ATTACHMENTS_PER_BRIEF - attachments.length
    if (remaining <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS_PER_BRIEF} files.`)
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)
    if (files.length > remaining) {
      setError(`Only ${remaining} more file${remaining === 1 ? "" : "s"} can be added.`)
    }

    setUploading(true)
    let current = attachments
    for (const file of toUpload) {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setError(`"${file.name}" is larger than 5 MB and wasn't uploaded.`)
        continue
      }
      try {
        const formData = new FormData()
        formData.append("file", file)
        const res = await fetch(`/api/public/briefs/${token}/attachments`, {
          method: "POST",
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to upload")
        current = [...current, data]
        onAttachmentsChange(current)
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to upload "${file.name}"`)
      }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  const handleRemove = async (id: string) => {
    const previous = attachments
    onAttachmentsChange(attachments.filter((a) => a.id !== id))
    try {
      const res = await fetch(`/api/public/briefs/${token}/attachments/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error()
    } catch {
      onAttachmentsChange(previous)
      setError("Failed to remove the file. Please try again.")
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Paperclip className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Add supporting files (optional)</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Logos, sketches, or reference documents. Images or PDF, up to 5 MB each,{" "}
        {MAX_ATTACHMENTS_PER_BRIEF} files max.
      </p>

      {attachments.length > 0 && (
        <ul className="mt-3 space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{a.filename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(a.size)}
                </span>
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${a.filename}`}
                onClick={() => handleRemove(a.id)}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {attachments.length < MAX_ATTACHMENTS_PER_BRIEF && (
        <div className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            className="hidden"
            id="attachment-input"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {uploading ? "Uploading…" : "Add files"}
          </Button>
        </div>
      )}
    </div>
  )
}

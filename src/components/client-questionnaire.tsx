"use client"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  File as FileIcon,
  FileText,
  Link as LinkIcon,
  Loader2,
  Paperclip,
  Pencil,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { Answers, ClientLink, Question } from "@/lib/schemas"
import { COVERAGE_AREAS } from "@/lib/interview"
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

// Mirrors the server cap in clientLinksSchema (src/lib/schemas.ts).
const MAX_CLIENT_LINKS = 10

export type AttachmentMeta = {
  id: string
  filename: string
  mimeType: string
  size: number
}

// Steps: 0 = intro, 1..N = questions, N+1 = review
export function ClientQuestionnaire({
  token,
  projectName,
  questions: initialQuestions,
  initialAnswers,
  alreadySubmitted,
  initialAttachments,
  agencyName,
  logoUrl,
  mode,
  initialLinks,
}: {
  token: string
  projectName: string | null
  questions: Question[]
  initialAnswers: Answers
  alreadySubmitted: boolean
  initialAttachments: AttachmentMeta[]
  agencyName: string
  logoUrl: string | null
  mode: "STATIC" | "ADAPTIVE"
  initialLinks: ClientLink[]
}) {
  const [step, setStep] = useState(0)
  // For STATIC briefs this never grows past the initial list. For ADAPTIVE
  // briefs, next-question appends to it as the interview progresses.
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  const [answers, setAnswers] = useState<Answers>(initialAnswers)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(alreadySubmitted)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<AttachmentMeta[]>(initialAttachments)
  const [links, setLinks] = useState<ClientLink[]>(initialLinks)

  // Adaptive-interview-only state.
  const [coveredAreas, setCoveredAreas] = useState<string[]>([])
  const [interviewLoading, setInterviewLoading] = useState(false)
  const [aiFailed, setAiFailed] = useState(false)

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

  // Returning clients (e.g. after follow-up questions were added) land on the
  // first unanswered question rather than re-reading answers they've given.
  const resumeStep = useMemo(() => {
    const idx = questions.findIndex((q) => !isAnswered(q))
    return idx === -1 ? totalSteps + 1 : idx + 1
  }, [questions, isAnswered, totalSteps])

  // Asks the server for the next interview question (or the signal that the
  // interview is done). The caller is responsible for having already flushed
  // any pending answers save and for passing the up-to-date answers object,
  // since React state updates made just before calling this aren't visible
  // via the `answers` closure yet.
  const fetchNextQuestion = useCallback(
    async (answersToSend: Answers) => {
      setInterviewLoading(true)
      try {
        const res = await fetch(`/api/public/briefs/${token}/next-question`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersToSend }),
        })
        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || "Couldn't get the next question. Please try again.")
        }
        setCoveredAreas(Array.isArray(data.coveredAreas) ? data.coveredAreas : [])
        if (!data.done && data.question) {
          setQuestions((prev) => [...prev, data.question as Question])
        }
        setStep((s) => s + 1)
      } catch (err) {
        setAiFailed(true)
        toast.error(
          err instanceof Error ? err.message : "Couldn't get the next question. Please try again."
        )
      } finally {
        setInterviewLoading(false)
      }
    },
    [token]
  )

  const handleNext = async (skip: boolean) => {
    if (!currentQuestion) return

    let effectiveAnswers = answers
    if (skip) {
      effectiveAnswers = { ...answers, [currentQuestion.id]: "" }
      setAnswers(effectiveAnswers)
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(effectiveAnswers), 800)
    } else if (currentQuestion.required && !isAnswered(currentQuestion)) {
      setValidationError("This question is required.")
      return
    }
    setValidationError(null)

    const isLastQuestion = step === totalSteps
    if (mode === "ADAPTIVE" && isLastQuestion) {
      // Flush the pending debounced save — next-question persists the
      // answers we send it directly, so there's no need for the older
      // timer to also fire (and it would just be redundant).
      if (saveTimer.current) {
        clearTimeout(saveTimer.current)
        saveTimer.current = null
      }
      setAiFailed(false)
      await fetchNextQuestion(effectiveAnswers)
      return
    }

    setStep((s) => Math.min(s + 1, totalSteps + 1))
  }

  const handleContinueToReviewInstead = () => {
    setAiFailed(false)
    setStep(totalSteps + 1)
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
      <Shell agencyName={agencyName} logoUrl={logoUrl}>
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
      <Shell agencyName={agencyName} logoUrl={logoUrl}>
        <div className="rounded-xl border bg-card p-8 shadow-sm sm:p-10">
          <h1 className="font-heading text-2xl font-bold sm:text-3xl">
            {projectName ? `Let's plan ${projectName}` : "Let's plan your project"}
          </h1>
          <p className="mt-4 text-muted-foreground">
            {mode === "ADAPTIVE" ? (
              <>
                This is a short AI-guided interview — answer one question at a
                time and the next question adapts to your answers. Usually
                8–15 questions.
              </>
            ) : (
              <>
                Before we start building, we&apos;d like to understand your
                goals. This questionnaire has {questions.length} questions and
                takes about {Math.max(5, Math.ceil(questions.length * 1.5))}{" "}
                minutes.
              </>
            )}
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
              {mode === "ADAPTIVE"
                ? "You can add files and links at the end"
                : "There are no wrong answers — plain language is perfect"}
            </li>
          </ul>
          <Button size="lg" className="mt-8" onClick={() => setStep(resumeStep)}>
            {answeredCount > 0 ? "Continue" : "Get started"}
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </Shell>
    )
  }

  if (step > totalSteps) {
    return (
      <Shell agencyName={agencyName} logoUrl={logoUrl}>
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
            links={links}
            onLinksChange={setLinks}
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
  const isLastQuestion = step === totalSteps
  const progress = Math.round(((step - 1) / totalSteps) * 100)
  const coveredCount = coveredAreas.length
  const coverageProgress = Math.max((coveredCount / COVERAGE_AREAS.length) * 100, 4)
  const nextLabel = interviewLoading
    ? "Thinking…"
    : mode === "STATIC" && isLastQuestion
      ? "Review answers"
      : "Next"

  return (
    <Shell agencyName={agencyName} logoUrl={logoUrl} saveState={saveState}>
      <div className="mb-6">
        {mode === "ADAPTIVE" ? (
          <>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Question {step}</span>
              <span>
                topics covered: {coveredCount} of {COVERAGE_AREAS.length}
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={coveredCount}
              aria-valuemin={0}
              aria-valuemax={COVERAGE_AREAS.length}
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${coverageProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
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
          </>
        )}
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
        <Button
          variant="outline"
          onClick={() => {
            setAiFailed(false)
            setStep((s) => s - 1)
          }}
          disabled={interviewLoading}
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          {mode === "ADAPTIVE" && !q.required && (
            <Button variant="outline" onClick={() => handleNext(true)} disabled={interviewLoading}>
              Skip
            </Button>
          )}
          <Button onClick={() => handleNext(false)} disabled={interviewLoading}>
            {interviewLoading && <Loader2 className="size-4 animate-spin" />}
            {nextLabel}
            {!interviewLoading && <ArrowRight className="size-4" />}
          </Button>
        </div>
      </div>

      {aiFailed && mode === "ADAPTIVE" && (
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={handleContinueToReviewInstead}>
            Continue to review instead
          </Button>
        </div>
      )}
    </Shell>
  )
}

function Shell({
  agencyName,
  logoUrl,
  saveState,
  children,
}: {
  agencyName: string
  logoUrl: string | null
  saveState?: SaveState
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary white-label logo host
              <img src={logoUrl} alt={agencyName} className="size-5 shrink-0 rounded object-contain" />
            ) : (
              <FileText className="size-4 shrink-0 text-primary" />
            )}
            <span className="truncate">{agencyName}</span>
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
  links,
  onLinksChange,
}: {
  token: string
  attachments: AttachmentMeta[]
  onAttachmentsChange: (next: AttachmentMeta[]) => void
  links: ClientLink[]
  onLinksChange: (next: ClientLink[]) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [linkUrl, setLinkUrl] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [savingLink, setSavingLink] = useState(false)

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

  const persistLinks = async (
    next: ClientLink[],
    previous: ClientLink[],
    failureMessage: string
  ) => {
    onLinksChange(next)
    setSavingLink(true)
    try {
      const res = await fetch(`/api/public/briefs/${token}/links`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links: next }),
      })
      if (!res.ok) throw new Error()
    } catch {
      onLinksChange(previous)
      toast.error(failureMessage)
    } finally {
      setSavingLink(false)
    }
  }

  const handleAddLink = () => {
    const url = linkUrl.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url)) {
      setLinkError("Links must start with http:// or https://")
      return
    }
    if (links.length >= MAX_CLIENT_LINKS) {
      setLinkError(`You can add up to ${MAX_CLIENT_LINKS} links.`)
      return
    }
    setLinkError(null)
    const previous = links
    setLinkUrl("")
    persistLinks([...previous, { url }], previous, "Failed to save the link. Please try again.")
  }

  const handleRemoveLink = (index: number) => {
    setLinkError(null)
    const previous = links
    persistLinks(
      previous.filter((_, i) => i !== index),
      previous,
      "Failed to remove the link. Please try again."
    )
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Paperclip className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-medium">Add supporting files &amp; links (optional)</h2>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Logos, sketches, reference documents, or links to brand guidelines and
        inspiration. Images or PDF, up to 5 MB each, {MAX_ATTACHMENTS_PER_BRIEF}{" "}
        files max, {MAX_CLIENT_LINKS} links max.
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

      <div className="mt-4 border-t pt-4">
        <p className="text-xs font-medium text-muted-foreground">Links</p>

        {links.length > 0 && (
          <ul className="mt-2 space-y-2">
            {links.map((link, i) => (
              <li
                key={`${i}-${link.url}`}
                className="flex items-center justify-between gap-2 rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <LinkIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{link.label || link.url}</span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remove link ${link.label || link.url}`}
                  onClick={() => handleRemoveLink(i)}
                >
                  <X className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {linkError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {linkError}
          </p>
        )}

        {links.length < MAX_CLIENT_LINKS && (
          <div className="mt-3 flex items-center gap-2">
            <Input
              value={linkUrl}
              onChange={(e) => {
                setLinkUrl(e.target.value)
                setLinkError(null)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddLink()
                }
              }}
              placeholder="https://example.com/brand-guidelines"
              aria-label="Link URL"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={savingLink || !linkUrl.trim()}
              onClick={handleAddLink}
            >
              {savingLink && <Loader2 className="size-4 animate-spin" />}
              Add link
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

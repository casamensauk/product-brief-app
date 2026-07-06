"use client"
import { Download, File as FileIcon, LinkIcon, MailQuestion } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { formatFileSize } from "@/lib/attachments"
import type { BriefData } from "@/components/brief-workspace"

export function ResponsesView({
  brief,
  onCopyLink,
}: {
  brief: BriefData
  onCopyLink: () => Promise<void>
}) {
  const answered = brief.questions.filter((q) => {
    const value = brief.answers[q.id]
    return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim())
  })

  if (answered.length === 0 && brief.attachments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
        <MailQuestion className="size-10 text-muted-foreground/50" />
        <h2 className="font-heading font-semibold">No answers yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Share the questionnaire link with your client. Their answers appear
          here as they type — no account needed on their side.
        </p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={async () => {
            await onCopyLink()
            toast.success("Client link copied")
          }}
        >
          <LinkIcon className="size-4" />
          Copy client link
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
        {brief.submittedAt
          ? `Submitted by the client on ${new Date(brief.submittedAt).toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" })}.`
          : `The client has answered ${answered.length} of ${brief.questions.length} questions but hasn't submitted yet.`}
      </p>

      <div className="space-y-3">
        {brief.questions.map((q, i) => {
          const value = brief.answers[q.id]
          const text = Array.isArray(value) ? value.join(", ") : value
          return (
            <div key={q.id} className="rounded-xl border bg-card p-4">
              <div className="text-xs font-medium text-muted-foreground">
                Question {i + 1}
              </div>
              <p className="mt-0.5 font-medium">{q.label}</p>
              {text?.trim() ? (
                <p className="mt-2 text-sm whitespace-pre-wrap">{text}</p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground italic">
                  Not answered
                </p>
              )}
            </div>
          )
        })}
      </div>

      {brief.attachments.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-medium">
            Attached files ({brief.attachments.length})
          </h3>
          <ul className="mt-2 space-y-2">
            {brief.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{a.filename}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(a.size)}
                  </span>
                </span>
                <a
                  href={`/api/attachments/${a.id}`}
                  className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Download className="size-3.5" />
                  Download
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

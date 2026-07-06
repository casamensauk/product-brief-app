"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Inbox, LinkIcon, Plus, Search } from "lucide-react"
import { toast } from "sonner"
import type { BriefStatus } from "@prisma/client"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CreateBriefDialog } from "@/components/create-brief-dialog"
import { copyShareLink } from "@/lib/share"
import { ALL_STATUSES, STATUS_BADGE_VARIANTS, STATUS_LABELS } from "@/lib/status"

export type BriefListItem = {
  id: string
  clientName: string
  projectName: string | null
  shareToken: string
  status: BriefStatus
  ownerName: string | null
  submittedAt: string | null
  updatedAt: string
}

export function BriefsList({ briefs }: { briefs: BriefListItem[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return briefs.filter((b) => {
      if (statusFilter !== "ALL" && b.status !== statusFilter) return false
      if (!q) return true
      return (
        b.clientName.toLowerCase().includes(q) ||
        (b.projectName ?? "").toLowerCase().includes(q)
      )
    })
  }, [briefs, query, statusFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="font-heading text-2xl font-bold">Discovery sessions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Questionnaires you&apos;ve shared with clients and the briefs built
            from their answers.
          </p>
        </div>
        <CreateBriefDialog />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client or project…"
            className="pl-8"
            aria-label="Search sessions"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as string)}
          items={{ ALL: "All statuses", ...STATUS_LABELS }}
        >
          <SelectTrigger aria-label="Filter by status" className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {briefs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed bg-card px-6 py-16 text-center">
          <Inbox className="size-10 text-muted-foreground/50" />
          <h2 className="font-heading font-semibold">No discovery sessions yet</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create your first session, tailor the questionnaire, and share the
            link with your client.
          </p>
          <CreateBriefDialog
            trigger={
              <Button className="mt-2">
                <Plus className="size-4" />
                New discovery session
              </Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Client</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                  Updated
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                    Nothing matches your search.
                  </td>
                </tr>
              ) : (
                filtered.map((brief) => (
                  <tr
                    key={brief.id}
                    className="cursor-pointer transition-colors hover:bg-muted/40"
                    onClick={() => router.push(`/dashboard/brief/${brief.id}`)}
                  >
                    <td
                      className="px-4 py-3 font-medium"
                      title={brief.ownerName ? `Created by ${brief.ownerName}` : undefined}
                    >
                      {brief.projectName || "Untitled project"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{brief.clientName}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANTS[brief.status]}>
                        {STATUS_LABELS[brief.status]}
                      </Badge>
                    </td>
                    <td
                      className="hidden px-4 py-3 text-muted-foreground md:table-cell"
                      suppressHydrationWarning
                    >
                      {new Date(brief.updatedAt).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async (e) => {
                          e.stopPropagation()
                          await copyShareLink(brief.shareToken)
                          toast.success("Client link copied")
                        }}
                      >
                        <LinkIcon className="size-3.5" />
                        Copy link
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

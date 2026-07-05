import type { BriefStatus } from "@prisma/client"

export const STATUS_LABELS: Record<BriefStatus, string> = {
  DRAFT: "Awaiting answers",
  SUBMITTED: "Answers received",
  REVIEWED: "Brief generated",
  SCOPED: "Scoped",
}

export const STATUS_BADGE_VARIANTS: Record<
  BriefStatus,
  "outline" | "warning" | "default" | "success"
> = {
  DRAFT: "outline",
  SUBMITTED: "warning",
  REVIEWED: "default",
  SCOPED: "success",
}

export const ALL_STATUSES: BriefStatus[] = ["DRAFT", "SUBMITTED", "REVIEWED", "SCOPED"]

import { prisma } from "@/lib/prisma"

export const DEFAULT_AGENCY_NAME = "Discovery Pro"

/**
 * Agency display name for emails and client-facing pages. Reads the singleton
 * WorkspaceSettings row (managed in WP10); falls back to the default.
 */
export async function getAgencyName(): Promise<string> {
  try {
    const settings = await prisma.workspaceSettings.findUnique({
      where: { id: "default" },
      select: { agencyName: true },
    })
    return settings?.agencyName || DEFAULT_AGENCY_NAME
  } catch {
    return DEFAULT_AGENCY_NAME
  }
}

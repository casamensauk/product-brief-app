import { prisma } from "@/lib/prisma"

export const DEFAULT_AGENCY_NAME = "Discovery Pro"

export type WorkspaceSettingsData = {
  agencyName: string
  logoUrl: string | null
}

/** Full workspace branding settings, with defaults when unset. */
export async function getSettings(): Promise<WorkspaceSettingsData> {
  try {
    const settings = await prisma.workspaceSettings.findUnique({
      where: { id: "default" },
      select: { agencyName: true, logoUrl: true },
    })
    return {
      agencyName: settings?.agencyName || DEFAULT_AGENCY_NAME,
      logoUrl: settings?.logoUrl ?? null,
    }
  } catch {
    return { agencyName: DEFAULT_AGENCY_NAME, logoUrl: null }
  }
}

/** Agency display name for emails. */
export async function getAgencyName(): Promise<string> {
  return (await getSettings()).agencyName
}

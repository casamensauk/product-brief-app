"use client"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { WorkspaceSettingsData } from "@/lib/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function BrandingSettings({
  initialSettings,
}: {
  initialSettings: WorkspaceSettingsData
}) {
  const [agencyName, setAgencyName] = useState(initialSettings.agencyName)
  const [logoUrl, setLogoUrl] = useState(initialSettings.logoUrl ?? "")
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agencyName: agencyName.trim(), logoUrl: logoUrl.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to save settings")
      toast.success("Branding updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="font-heading font-semibold">Branding</h2>
        <p className="text-sm text-muted-foreground">
          Shown on the client questionnaire and shared brief pages.
        </p>
      </div>
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div className="grid gap-2">
          <Label htmlFor="agencyName">Agency name</Label>
          <Input
            id="agencyName"
            value={agencyName}
            onChange={(e) => setAgencyName(e.target.value)}
            placeholder="Discovery Pro"
            maxLength={200}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="logoUrl">Logo URL (optional)</Label>
          <Input
            id="logoUrl"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          <p className="text-xs text-muted-foreground">
            Must be an https:// image URL. Leave blank to use the default icon.
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!agencyName.trim() || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save branding
          </Button>
        </div>
      </div>
    </section>
  )
}

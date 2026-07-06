"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type TemplateOption = { id: string; name: string; questionCount: number }

export function CreateBriefDialog({ trigger }: { trigger?: React.ReactElement }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [clientName, setClientName] = useState("")
  const [projectName, setProjectName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [templateId, setTemplateId] = useState("default")
  const [templates, setTemplates] = useState<TemplateOption[]>([])

  useEffect(() => {
    if (!open) return
    fetch("/api/templates")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
  }, [open])

  const templateItems = {
    default: "Default questionnaire",
    ...Object.fromEntries(
      templates.map((t) => [t.id, `${t.name} (${t.questionCount} questions)`])
    ),
  }

  const handleCreate = async () => {
    if (creating) return
    setCreating(true)
    try {
      const res = await fetch("/api/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, projectName, contactEmail, templateId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create the session")
      router.push(`/dashboard/brief/${data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create the session")
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="lg">
              <Plus className="size-4" />
              New discovery session
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New discovery session</DialogTitle>
          <DialogDescription>
            You&apos;ll get a questionnaire you can tailor before sharing it
            with the client.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (clientName.trim()) handleCreate()
          }}
        >
          <div className="grid gap-2">
            <Label htmlFor="clientName">Client name</Label>
            <Input
              id="clientName"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="e.g. Acme Corp"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="projectName">Project name (optional)</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Website redesign"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="contactEmail">Client contact email (optional)</Label>
            <Input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="template">Questionnaire</Label>
            <Select value={templateId} onValueChange={(v) => setTemplateId(v as string)} items={templateItems}>
              <SelectTrigger id="template" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default questionnaire</SelectItem>
                {templates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.questionCount} questions)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={creating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!clientName.trim() || creating}>
            {creating && <Loader2 className="size-4 animate-spin" />}
            Create session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-surface-container-highest text-on-surface-variant'
    case 'SUBMITTED':
      return 'bg-secondary-container text-on-secondary-container'
    case 'REVIEWED':
      return 'bg-primary-container text-on-primary'
    case 'SCOPED':
      return 'bg-tertiary-container text-on-tertiary-container'
    default:
      return 'bg-surface-container-highest text-on-surface-variant'
  }
}

export default function DashboardPage() {
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [isOpen, setIsOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [clientName, setClientName] = useState("")
  const [projectName, setProjectName] = useState("")

  useEffect(() => {
    fetch('/api/briefs')
      .then(res => res.json())
      .then(data => {
        setBriefs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  const handleCreateBrief = async () => {
    setIsCreating(true)
    try {
      const res = await fetch('/api/briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, projectName })
      })
      if (res.ok) {
        const data = await res.json()
        window.location.href = `/dashboard/brief/${data.shareToken}`
      } else {
        alert("Failed to create discovery session")
        setIsCreating(false)
      }
    } catch (e) {
      console.error(e)
      alert("Failed to create discovery session")
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-container-max mx-auto space-y-10">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Dashboard</h1>
          <p className="text-body-md text-on-surface-variant mt-1">Monitor and manage your client discovery sessions.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger className="flex items-center gap-2 bg-secondary text-on-secondary px-6 py-3 rounded-xl hover:bg-secondary-container hover:text-on-secondary-container transition-all shadow-sm active:scale-95 cursor-pointer">
            <span className="material-symbols-outlined">rocket_launch</span>
            <span className="font-label-md text-label-md">Start New Discovery</span>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Discovery Session</DialogTitle>
              <DialogDescription>
                Enter the basic details to start a new discovery session.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input id="clientName" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="e.g. Acme Corp" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input id="projectName" value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="e.g. Website Redesign" />
              </div>
            </div>
            <DialogFooter>
              <DialogClose className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Cancel
              </DialogClose>
              <Button onClick={handleCreateBrief} disabled={!clientName || isCreating}>
                {isCreating ? "Creating..." : "Start Discovery"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Discovery Sessions Table (Grid Spanning 8 columns) */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm flex flex-col">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-bright flex items-center justify-between">
            <h3 className="font-headline-sm text-headline-sm">Discovery Sessions</h3>
            <div className="flex gap-2">
              <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
              <button className="p-2 hover:bg-surface-container-high rounded-lg transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">search</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      Loading sessions...
                    </td>
                  </tr>
                ) : briefs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      No discovery sessions found. Create a new one to get started.
                    </td>
                  </tr>
                ) : (
                  briefs.map(brief => (
                    <tr key={brief.id} className="hover:bg-surface-container-low transition-colors group cursor-pointer" onClick={() => window.location.href = `/dashboard/brief/${brief.shareToken}`}>
                      <td className="px-6 py-4">
                        <span className="font-body-md font-semibold text-on-surface">{brief.projectName || 'Unnamed Project'}</span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{brief.clientName || 'Unknown Client'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(brief.status)}`}>
                          {brief.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-label-md text-on-surface-variant">
                        {new Date(brief.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/dashboard/brief/${brief.shareToken}`} className="text-secondary hover:underline font-label-md">
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          <div className="mt-auto px-6 py-4 bg-surface-container-low flex items-center justify-between text-label-sm text-on-surface-variant">
            <span>Showing {briefs.length} sessions</span>
            <div className="flex gap-2">
              <button className="px-3 py-1 border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-50" disabled>Previous</button>
              <button className="px-3 py-1 border border-outline-variant rounded-lg hover:bg-surface-container-high disabled:opacity-50" disabled={briefs.length < 10}>Next</button>
            </div>
          </div>
        </div>

        {/* Recent Activity Widget (Right Column) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">history</span>
              Recent Activity
            </h3>
            <div className="space-y-4">
              {briefs.slice(0, 3).map((brief, index) => (
                <div key={`activity-${brief.id}`} className={`flex gap-3 ${index < 2 ? 'relative pb-4' : ''}`}>
                  {index < 2 && <div className="absolute left-[11px] top-6 bottom-0 w-[1px] bg-outline-variant"></div>}
                  <div className={`z-10 w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 mt-1 ${index === 0 ? 'bg-secondary text-on-secondary' : index === 1 ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-highest text-on-surface-variant border border-outline-variant'}`}>
                    <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {index === 0 ? 'check' : index === 1 ? 'edit' : 'person_add'}
                    </span>
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-on-surface">
                      {index === 0 ? 'Brief Updated' : index === 1 ? 'Draft Saved' : 'New Client Added'}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {brief.projectName || brief.clientName}
                    </p>
                    <span className="text-[11px] text-outline mt-1 block">
                      {new Date(brief.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
              {briefs.length === 0 && (
                <div className="text-sm text-on-surface-variant italic">No recent activity.</div>
              )}
            </div>
            {briefs.length > 0 && <button className="w-full mt-6 text-secondary font-label-md hover:underline">View all activity</button>}
          </div>

          {/* Template Quick Access */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h3 className="font-headline-sm text-headline-sm mb-4">Quick Templates</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-surface-variant hover:border-secondary hover:bg-surface-container-high transition-all text-center gap-2 group">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">corporate_fare</span>
                <span className="text-label-sm font-medium">B2B SaaS</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-surface-variant hover:border-secondary hover:bg-surface-container-high transition-all text-center gap-2 group">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">account_balance</span>
                <span className="text-label-sm font-medium">FinTech</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-surface-variant hover:border-secondary hover:bg-surface-container-high transition-all text-center gap-2 group">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">health_and_safety</span>
                <span className="text-label-sm font-medium">Healthcare</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 rounded-xl border border-surface-variant hover:border-secondary hover:bg-surface-container-high transition-all text-center gap-2 group">
                <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary">more_horiz</span>
                <span className="text-label-sm font-medium">Browse All</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

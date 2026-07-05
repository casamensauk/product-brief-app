"use client"
import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import Link from "next/link"

export default function DashboardPage() {
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/briefs')
      .then(res => res.json())
      .then(data => {
        setBriefs(Array.isArray(data) ? data : [])
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Loading briefs...</div>

  return (
    <div className="grid gap-6 md:grid-cols-4">
      {['DRAFT', 'SUBMITTED', 'REVIEWED', 'SCOPED'].map(status => (
        <div key={status} className="space-y-4">
          <h2 className="font-semibold text-lg pb-2 border-b">{status}</h2>
          {briefs.filter(b => b.status === status).map(brief => (
            <Link key={brief.id} href={`/dashboard/brief/${brief.shareToken}`} className="block">
              <Card className="hover:border-primary cursor-pointer transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{brief.projectName || brief.clientName || 'Unnamed Project'}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Client: {brief.clientName}
                  <br/>
                  Updated: {new Date(brief.updatedAt).toLocaleDateString()}
                </CardContent>
              </Card>
            </Link>
          ))}
          {briefs.filter(b => b.status === status).length === 0 && (
            <div className="text-sm text-muted-foreground italic">No briefs in this stage.</div>
          )}
        </div>
      ))}
    </div>
  )
}

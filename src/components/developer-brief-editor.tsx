"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function DeveloperBriefEditor({ brief }: { brief: any }) {
  const [data, setData] = useState(brief)
  const [isSaving, setIsSaving] = useState(false)
  const [purposeStr, setPurposeStr] = useState(JSON.stringify(brief.purposeData || {}, null, 2))
  const [featureStr, setFeatureStr] = useState(JSON.stringify(brief.featureMatrix || [], null, 2))
  const [techStr, setTechStr] = useState(JSON.stringify(brief.techRequirements || {}, null, 2))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...data,
        purposeData: JSON.parse(purposeStr),
        featureMatrix: JSON.parse(featureStr),
        techRequirements: JSON.parse(techStr),
      }
      await fetch(`/api/briefs/${brief.shareToken}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
      alert("Saved successfully")
    } catch (e) {
      alert("Error saving: invalid JSON")
    }
    setIsSaving(false)
  }

  const exportToMarkdown = () => {
    let purp = {}; let feat = []; let tech = {};
    try {
      purp = JSON.parse(purposeStr);
      feat = JSON.parse(featureStr);
      tech = JSON.parse(techStr);
    } catch (e) {
      alert("Please fix JSON before exporting")
      return
    }

    const md = `# Product Brief: ${data.projectName || data.clientName}
    
## 1. Context & Admin
- **Client**: ${data.clientName}
- **Contact Email**: ${data.contactEmail || "N/A"}
- **Status**: ${data.status}

## 2. Deep Purpose & Vision
- **Job to be Done**: ${purp.jtbd || "N/A"}
- **Before & After**: ${purp.beforeAfter || "N/A"}
- **Business Drivers**: ${purp.businessDrivers || "N/A"}
- **Anti-Goals**: ${purp.antiGoals || "N/A"}

## 3. User Roles
${data.userRoles || "N/A"}

## 4. Feature Matrix
${feat.map((f: any) => `- **${f.name}** (${f.priority || "Normal"}): ${f.description || ""}`).join("\n") || "N/A"}

## 5. Tech Requirements
- **Hosting**: ${tech.hosting || "N/A"}
- **Database**: ${tech.database || "N/A"}
- **Third Party**: ${tech.thirdParty || "N/A"}
`

    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ProductBrief_${data.clientName}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Editing: {data.projectName || data.clientName}</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={exportToMarkdown}>Export Markdown</Button>
          <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Admin & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select 
            value={data.status} 
            onValueChange={val => setData({...data, status: val})}
          >
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="SUBMITTED">SUBMITTED</SelectItem>
              <SelectItem value="REVIEWED">REVIEWED</SelectItem>
              <SelectItem value="SCOPED">SCOPED</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader><CardTitle>Raw Purpose Data (JSON)</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            className="font-mono h-40" 
            value={purposeStr}
            onChange={e => setPurposeStr(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Raw Feature Matrix (JSON)</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            className="font-mono h-40" 
            value={featureStr}
            onChange={e => setFeatureStr(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Raw Tech Requirements (JSON)</CardTitle></CardHeader>
        <CardContent>
          <Textarea 
            className="font-mono h-40" 
            value={techStr}
            onChange={e => setTechStr(e.target.value)}
          />
        </CardContent>
      </Card>
    </div>
  )
}

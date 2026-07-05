"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function DeveloperBriefEditor({ brief }: { brief: any }) {
  const [data, setData] = useState(brief)
  const [isSaving, setIsSaving] = useState(false)
  
  const [stakeholdersStr, setStakeholdersStr] = useState(JSON.stringify(brief.stakeholders || [], null, 2))
  const [gatheringStr, setGatheringStr] = useState(JSON.stringify(brief.gatheringMethods || {}, null, 2))
  const [reqsStr, setReqsStr] = useState(JSON.stringify(brief.categorisedRequirements || [], null, 2))
  const [analysisStr, setAnalysisStr] = useState(JSON.stringify(brief.analysisModels || {}, null, 2))
  const [docsStr, setDocsStr] = useState(JSON.stringify(brief.documentationData || {}, null, 2))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...data,
        stakeholders: JSON.parse(stakeholdersStr),
        gatheringMethods: JSON.parse(gatheringStr),
        categorisedRequirements: JSON.parse(reqsStr),
        analysisModels: JSON.parse(analysisStr),
        documentationData: JSON.parse(docsStr)
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
    let stk: any[] = []; let gath: any = {}; let reqs: any[] = []; 
    let ana: any = {}; let doc: any = {};
    
    try {
      stk = JSON.parse(stakeholdersStr);
      gath = JSON.parse(gatheringStr);
      reqs = JSON.parse(reqsStr);
      ana = JSON.parse(analysisStr);
      doc = JSON.parse(docsStr);
    } catch (e) {
      alert("Please fix JSON before exporting")
      return
    }

    const md = `# Requirements Analysis Document (RAD)

## 1. Key Stakeholders
${stk.map((s: any) => `- **${s.name || "N/A"}** (${s.role || "N/A"}): ${s.influence || "N/A"}`).join("\n") || "No stakeholders identified."}

## 2. Requirements Gathering
- **Interviews**: ${gath.interviews ? "Yes" : "No"}
- **Focus Groups**: ${gath.focusGroups ? "Yes" : "No"}
- **Surveys**: ${gath.surveys ? "Yes" : "No"}
- **Document Observations**: ${gath.documentObservations ? "Yes" : "No"}

### User Stories
${gath.userStories || "N/A"}

### Use Cases
${gath.useCases || "N/A"}

## 3. Categorised Requirements
${reqs.map((r: any) => `- **[${r.category || "Uncategorised"}]** ${r.name || "N/A"} (${r.priority || "Normal"}): ${r.description || ""}`).join("\n") || "No requirements added."}

## 4. Requirements Analysis & Modelling
- **Context Diagram**: ${ana.contextDiagramUrl || "N/A"}
  - *Notes*: ${ana.contextDiagramNotes || "N/A"}
- **Prototype / Wireframes**: ${ana.prototypeUrl || "N/A"}
  - *Notes*: ${ana.prototypeNotes || "N/A"}

## 5. Documentation (RAD) Overview
- **Purpose**: ${doc.purpose || "N/A"}
- **Audience**: ${doc.audience || "N/A"}
- **Timeline**: ${doc.timeline || "N/A"}
- **Budget**: ${doc.budget || "N/A"}
- **Success Metrics**: ${doc.successMetrics || "N/A"}
`

    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `RequirementsAnalysis_${data.clientName}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Editing RAD for: {data.clientName}</h2>
        <div className="space-x-2 flex">
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
      
      <Card><CardHeader><CardTitle>1. Stakeholders (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={stakeholdersStr} onChange={e => setStakeholdersStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>2. Gathering Methods (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={gatheringStr} onChange={e => setGatheringStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>3. Categorised Requirements (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={reqsStr} onChange={e => setReqsStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>4. Analysis Models (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={analysisStr} onChange={e => setAnalysisStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>5. Documentation Data (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={docsStr} onChange={e => setDocsStr(e.target.value)} /></CardContent></Card>
    </div>
  )
}

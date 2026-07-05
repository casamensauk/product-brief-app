"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

export default function DeveloperBriefEditor({ brief }: { brief: any }) {
  const [data, setData] = useState(brief)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const res = await fetch(`/api/briefs/${data.shareToken}/generate`, { method: "POST" })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to generate")
      }
      const updated = await res.json()
      setData(updated)
      alert("Requirements generated successfully!")
    } catch (e: any) {
      alert("Error generating: " + e.message)
    }
    setIsGenerating(false)
  }

  const exportToMarkdown = () => {
    const stk = data.stakeholders || [];
    const gath = data.gatheringMethods || {};
    const reqs = data.categorisedRequirements || [];
    const ana = data.analysisModels || {};
    const doc = data.documentationData || {};

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

  const hasGeneratedData = data.stakeholders || data.categorisedRequirements?.length > 0;
  const raw = data.rawClientAnswers || {};

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Editing Brief: {data.clientName}</h2>
        <div className="space-x-2 flex">
          <Button variant="outline" onClick={exportToMarkdown}>Export to Markdown</Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Admin & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select 
            value={data.status} 
            onValueChange={async (val) => {
              setData({...data, status: val})
              // Optimistically update status
              await fetch(`/api/briefs/${data.shareToken}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: val })
              })
            }}
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
      
      <Card className="bg-slate-50">
        <CardHeader>
          <CardTitle>Raw Client Questionnaire Answers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div><strong>About Company:</strong> <p className="text-muted-foreground whitespace-pre-wrap">{raw.aboutCompany || "Not answered"}</p></div>
          <div><strong>Primary Problem:</strong> <p className="text-muted-foreground whitespace-pre-wrap">{raw.primaryProblem || "Not answered"}</p></div>
          <div><strong>Target Users:</strong> <p className="text-muted-foreground whitespace-pre-wrap">{raw.targetUsers || "Not answered"}</p></div>
          <div><strong>Must Have Features:</strong> <p className="text-muted-foreground whitespace-pre-wrap">{raw.mustHaveFeatures || "Not answered"}</p></div>
          <div><strong>Design Inspiration:</strong> <p className="text-muted-foreground whitespace-pre-wrap">{raw.designInspiration || "Not answered"}</p></div>
          <div><strong>Logistics (Timeline/Budget):</strong> <p className="text-muted-foreground whitespace-pre-wrap">{raw.logistics || "Not answered"}</p></div>
        </CardContent>
      </Card>

      <div className="flex justify-center py-4">
        <Button size="lg" onClick={handleGenerate} disabled={isGenerating} className="w-full max-w-md gap-2">
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : "✨"}
          {isGenerating ? "Generating Requirements with AI..." : "✨ Generate Formal Requirements with AI"}
        </Button>
      </div>

      {hasGeneratedData && (
        <div className="space-y-6">
          <h3 className="text-xl font-bold border-b pb-2">AI Generated Requirements Analysis (RAD)</h3>
          
          <Card>
            <CardHeader><CardTitle>1. Stakeholders</CardTitle></CardHeader>
            <CardContent>
              <ul className="list-disc pl-5">
                {data.stakeholders?.map((s: any, i: number) => (
                  <li key={i}><strong>{s.name}</strong> ({s.role}) - {s.influence}</li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>2. Gathering Methods & Stories</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-sm">
                <span>Interviews: {data.gatheringMethods?.interviews ? "✅" : "❌"}</span>
                <span>Surveys: {data.gatheringMethods?.surveys ? "✅" : "❌"}</span>
              </div>
              <div>
                <strong>User Stories</strong>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.gatheringMethods?.userStories}</p>
              </div>
              <div>
                <strong>Use Cases</strong>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{data.gatheringMethods?.useCases}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>3. Categorised Requirements</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.categorisedRequirements?.map((r: any, i: number) => (
                  <div key={i} className="border p-3 rounded-md">
                    <div className="flex justify-between">
                      <span className="font-semibold">{r.name}</span>
                      <span className="text-xs bg-slate-100 px-2 py-1 rounded">{r.category} | {r.priority}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{r.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>4. Analysis Models</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Context Diagram:</strong> <a href={data.analysisModels?.contextDiagramUrl} className="text-blue-500 underline">{data.analysisModels?.contextDiagramUrl || "None"}</a></div>
              <div><p className="text-muted-foreground">{data.analysisModels?.contextDiagramNotes}</p></div>
              <div className="mt-4"><strong>Prototype:</strong> <a href={data.analysisModels?.prototypeUrl} className="text-blue-500 underline">{data.analysisModels?.prototypeUrl || "None"}</a></div>
              <div><p className="text-muted-foreground">{data.analysisModels?.prototypeNotes}</p></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>5. Documentation</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><strong>Purpose:</strong> {data.documentationData?.purpose}</div>
              <div><strong>Audience:</strong> {data.documentationData?.audience}</div>
              <div><strong>Timeline:</strong> {data.documentationData?.timeline}</div>
              <div><strong>Budget:</strong> {data.documentationData?.budget}</div>
              <div><strong>Success Metrics:</strong> {data.documentationData?.successMetrics}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

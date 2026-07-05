"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

export default function DeveloperBriefEditor({ brief }: { brief: any }) {
  const [data, setData] = useState(brief)
  const [isSaving, setIsSaving] = useState(false)
  
  const [contextStr, setContextStr] = useState(JSON.stringify(brief.contextData || {}, null, 2))
  const [purposeStr, setPurposeStr] = useState(JSON.stringify(brief.purposeData || {}, null, 2))
  const [rolesStr, setRolesStr] = useState(JSON.stringify(brief.userRoles || {}, null, 2))
  const [featureStr, setFeatureStr] = useState(JSON.stringify(brief.featureMatrix || [], null, 2))
  const [techStr, setTechStr] = useState(JSON.stringify(brief.techRequirements || {}, null, 2))
  const [designStr, setDesignStr] = useState(JSON.stringify(brief.designData || {}, null, 2))
  const [logisticsStr, setLogisticsStr] = useState(JSON.stringify(brief.logisticsData || {}, null, 2))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = {
        ...data,
        contextData: JSON.parse(contextStr),
        purposeData: JSON.parse(purposeStr),
        userRoles: JSON.parse(rolesStr),
        featureMatrix: JSON.parse(featureStr),
        techRequirements: JSON.parse(techStr),
        designData: JSON.parse(designStr),
        logisticsData: JSON.parse(logisticsStr)
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
    let ctx: any = {}; let purp: any = {}; let roles: any = {}; 
    let feat: any[] = []; let tech: any = {}; let des: any = {}; let log: any = {};
    
    try {
      ctx = JSON.parse(contextStr);
      purp = JSON.parse(purposeStr);
      roles = JSON.parse(rolesStr);
      feat = JSON.parse(featureStr);
      tech = JSON.parse(techStr);
      des = JSON.parse(designStr);
      log = JSON.parse(logisticsStr);
    } catch (e) {
      alert("Please fix JSON before exporting")
      return
    }

    const md = `# Product Brief: ${ctx.projectName || data.clientName}

## 1. Client & Project Context
- **Company**: ${ctx.companyName || data.clientName || "N/A"}
- **Primary Contact**: ${ctx.primaryContact || "N/A"}
- **Project Name**: ${ctx.projectName || "N/A"}
- **Primary Goal**: ${ctx.primaryGoal || "N/A"}
- **Project Type**: ${ctx.projectType || "N/A"}

## 2. Core Purpose & Target Audience
- **Problem Statement**: ${purp.problemStatement || "N/A"}
- **Target Audience**: ${purp.targetAudience || "N/A"}
- **Value Proposition**: ${purp.valueProp || "N/A"}
- **Inclusive Design**: ${purp.inclusiveDesign || "N/A"}
- **Job to be Done (JTBD)**: ${purp.jtbd || "N/A"}
- **Before & After**: ${purp.beforeAfter || "N/A"}
- **Business Drivers**: ${purp.businessDrivers || "N/A"}
- **Anti-Goals**: ${purp.antiGoals || "N/A"}
- **Magic Moment**: ${purp.magicMoment || "N/A"}

## 3. User Roles & Permissions
- **Requires Auth**: ${roles.requiresAuth ? "Yes" : "No"}
- **Auth Methods**: ${roles.authMethods?.join(", ") || "N/A"}
- **Roles & Permissions**: 
${roles.rolesDescription || "N/A"}

## 4. Feature Matrix
${feat.map((f: any) => `- **${f.name}** (${f.priority || "Normal"}): ${f.description || ""}`).join("\n") || "N/A"}

## 5. Infrastructure, Tech Stack & Integrations
- **Hosting**: ${tech.hosting || "N/A"}
- **Database**: ${tech.database || "N/A"}
- **AI Integrations**: ${tech.aiIntegrations || "N/A"}
- **Requires Monetization**: ${tech.requiresMonetization ? "Yes" : "No"}
- **Monetization Model**: ${tech.monetizationModel || "N/A"}
- **Third-Party APIs**: ${tech.thirdParty || "N/A"}

## 6. Design & Branding
- **Brand Guidelines**: ${des.brandGuidelines || "N/A"}
- **UI/UX Vibe**: ${des.uiUxVibe || "N/A"}
- **Mobile Responsiveness**: ${des.mobileResponsiveness || "N/A"}

## 7. Logistics, Compliance & Delivery
- **Compliance**: ${log.compliance || "N/A"}
- **Target Launch Date**: ${log.launchDate || "N/A"}
- **Deadline Type**: ${log.deadlineType || "N/A"}
- **Budget Range**: ${log.budget || "N/A"}
- **Success Metrics**: ${log.successMetrics || "N/A"}
`

    const blob = new Blob([md], { type: "text/markdown" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ProductBrief_${ctx.companyName || data.clientName}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Editing: {data.projectName || data.clientName}</h2>
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
      
      <Card><CardHeader><CardTitle>1. Context (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={contextStr} onChange={e => setContextStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>2. Purpose Data (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={purposeStr} onChange={e => setPurposeStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>3. User Roles (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={rolesStr} onChange={e => setRolesStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>4. Feature Matrix (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={featureStr} onChange={e => setFeatureStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>5. Tech Requirements (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={techStr} onChange={e => setTechStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>6. Design Data (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={designStr} onChange={e => setDesignStr(e.target.value)} /></CardContent></Card>
      <Card><CardHeader><CardTitle>7. Logistics Data (JSON)</CardTitle></CardHeader><CardContent><Textarea className="font-mono h-40" value={logisticsStr} onChange={e => setLogisticsStr(e.target.value)} /></CardContent></Card>
    </div>
  )
}

"use client"
import { useState, useEffect, useCallback } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import debounce from "lodash/debounce"

const formSchema = z.object({
  stakeholders: z.array(z.object({
    name: z.string().min(1, "Name is required"),
    role: z.string().optional(),
    influence: z.string().optional()
  })).optional(),
  gatheringMethods: z.object({
    interviews: z.boolean().optional(),
    focusGroups: z.boolean().optional(),
    surveys: z.boolean().optional(),
    documentObservations: z.boolean().optional(),
    userStories: z.string().optional(),
    useCases: z.string().optional()
  }).optional(),
  categorisedRequirements: z.array(z.object({
    name: z.string().min(1, "Requirement name is required"),
    category: z.string().optional(), // Functional, Non-functional, Technical, Operational, Transitional
    priority: z.string().optional(),
    description: z.string().optional()
  })).optional(),
  analysisModels: z.object({
    contextDiagramUrl: z.string().optional(),
    contextDiagramNotes: z.string().optional(),
    prototypeUrl: z.string().optional(),
    prototypeNotes: z.string().optional()
  }).optional(),
  documentationData: z.object({
    purpose: z.string().optional(),
    audience: z.string().optional(),
    successMetrics: z.string().optional(),
    timeline: z.string().optional(),
    budget: z.string().optional()
  }).optional(),
})

type FormData = z.infer<typeof formSchema>

export default function ClientForm({ initialData, token }: { initialData: any, token: string }) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stakeholders: initialData?.stakeholders || [],
      gatheringMethods: initialData?.gatheringMethods || {},
      categorisedRequirements: initialData?.categorisedRequirements || [],
      analysisModels: initialData?.analysisModels || {},
      documentationData: initialData?.documentationData || {}
    }
  })

  const { fields: stakeholderFields, append: appendStakeholder, remove: removeStakeholder } = useFieldArray({
    control: form.control,
    name: "stakeholders"
  })

  const { fields: reqFields, append: appendReq, remove: removeReq } = useFieldArray({
    control: form.control,
    name: "categorisedRequirements"
  })

  const saveToDb = async (data: FormData) => {
    setIsSaving(true)
    try {
      await fetch(`/api/briefs/${token}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      })
    } catch (e) {
      console.error("Save failed", e)
    } finally {
      setIsSaving(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSave = useCallback(debounce(saveToDb, 1000), [token])

  useEffect(() => {
    const subscription = form.watch((value) => {
      debouncedSave(value as FormData)
    })
    return () => subscription.unsubscribe()
  }, [form.watch, debouncedSave])

  const nextStep = () => setStep(s => Math.min(s + 1, 5))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Requirements Analysis</h1>
        <span className="text-sm text-muted-foreground">
          {isSaving ? "Saving..." : "Saved"} | Step {step} of 5
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "1. Identify Key Stakeholders"}
            {step === 2 && "2. Requirements Gathering"}
            {step === 3 && "3. Categorise & Prioritise Requirements"}
            {step === 4 && "4. Requirements Analysis & Modelling"}
            {step === 5 && "5. Requirements Documentation"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Identify all business owners, investors, analysts, sponsors, managers, and end-users."}
            {step === 2 && "Detail the methods used to gather requirements and specify the use cases/user stories."}
            {step === 3 && "Categorise into Functional, Non-functional, Technical, Operational, and Transitional."}
            {step === 4 && "Provide context diagrams and prototypes to visually align with business needs."}
            {step === 5 && "Finalise the agreement, including purpose, audience, budget, and metrics."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {step === 1 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">Add stakeholders who have a say in the software project.</p>
                {stakeholderFields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border p-4 rounded-md">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input {...form.register(`stakeholders.${index}.name` as const)} placeholder="e.g. Jane Doe" />
                        </div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Input {...form.register(`stakeholders.${index}.role` as const)} placeholder="e.g. Product Owner" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Influence / Interest</Label>
                        <Input {...form.register(`stakeholders.${index}.influence` as const)} placeholder="e.g. Final Approver" />
                      </div>
                    </div>
                    <Button type="button" variant="destructive" onClick={() => removeStakeholder(index)}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendStakeholder({ name: "", role: "", influence: "" })}>
                  Add Stakeholder
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label>Requirements Gathering Techniques Used</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox id="interviews" checked={form.watch("gatheringMethods.interviews")} onCheckedChange={(c) => form.setValue("gatheringMethods.interviews", c as boolean)} />
                      <Label htmlFor="interviews">Interviews</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="focusGroups" checked={form.watch("gatheringMethods.focusGroups")} onCheckedChange={(c) => form.setValue("gatheringMethods.focusGroups", c as boolean)} />
                      <Label htmlFor="focusGroups">Focus Groups</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="surveys" checked={form.watch("gatheringMethods.surveys")} onCheckedChange={(c) => form.setValue("gatheringMethods.surveys", c as boolean)} />
                      <Label htmlFor="surveys">Surveys / Questionnaires</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox id="docs" checked={form.watch("gatheringMethods.documentObservations")} onCheckedChange={(c) => form.setValue("gatheringMethods.documentObservations", c as boolean)} />
                      <Label htmlFor="docs">Document Observations</Label>
                    </div>
                  </div>
                </div>
                
                <hr />

                <div className="space-y-2">
                  <Label>User Stories</Label>
                  <p className="text-xs text-muted-foreground">Focus on user needs, expectations, and goals.</p>
                  <Textarea {...form.register("gatheringMethods.userStories")} className="min-h-[100px]" placeholder="As a [user type], I want to [action] so that [benefit]..." />
                </div>
                
                <div className="space-y-2">
                  <Label>Use Cases</Label>
                  <p className="text-xs text-muted-foreground">Determine system behaviour from the end user's perspective.</p>
                  <Textarea {...form.register("gatheringMethods.useCases")} className="min-h-[100px]" placeholder="Use Case 1: User logs in..." />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">List requirements and categorise them (Functional, Non-functional, Technical, Operational, Transitional).</p>
                {reqFields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border p-4 rounded-md">
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Requirement Name</Label>
                          <Input {...form.register(`categorisedRequirements.${index}.name` as const)} placeholder="e.g. SSO Login" />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <select 
                            {...form.register(`categorisedRequirements.${index}.category` as const)}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select a category...</option>
                            <option value="Functional">Functional (System Behavior)</option>
                            <option value="Non-functional">Non-functional (Performance/Attributes)</option>
                            <option value="Technical">Technical (Development Issues)</option>
                            <option value="Operational">Operational (Backend/Running)</option>
                            <option value="Transitional">Transitional (Implementation)</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description & Details</Label>
                        <Textarea {...form.register(`categorisedRequirements.${index}.description` as const)} placeholder="Describe the requirement in detail..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input {...form.register(`categorisedRequirements.${index}.priority` as const)} placeholder="Must-have / Should-have / Nice-to-have" />
                      </div>
                    </div>
                    <Button type="button" variant="destructive" onClick={() => removeReq(index)}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendReq({ name: "", category: "", description: "", priority: "" })}>
                  Add Requirement
                </Button>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Context Diagram</h3>
                  <p className="text-sm text-muted-foreground">Show the interfaces and boundaries of the proposed system with the external world.</p>
                  <div className="space-y-2">
                    <Label>Diagram URL</Label>
                    <Input {...form.register("analysisModels.contextDiagramUrl")} placeholder="https://miro.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Context Notes</Label>
                    <Textarea {...form.register("analysisModels.contextDiagramNotes")} placeholder="Notes about the data flow and entities..." />
                  </div>
                </div>
                
                <hr />

                <div className="space-y-4">
                  <h3 className="font-semibold">Prototype / Wireframes</h3>
                  <p className="text-sm text-muted-foreground">Provide links to testable products to gather feedback from the end-user's perspective.</p>
                  <div className="space-y-2">
                    <Label>Prototype URL</Label>
                    <Input {...form.register("analysisModels.prototypeUrl")} placeholder="https://figma.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label>Prototype Notes</Label>
                    <Textarea {...form.register("analysisModels.prototypeNotes")} placeholder="Feedback and beta phase notes..." />
                  </div>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">The final Requirements Analysis Document (RAD) overview.</p>
                <div className="space-y-2">
                  <Label>Project Purpose</Label>
                  <Textarea {...form.register("documentationData.purpose")} placeholder="High-level purpose of the project..." />
                </div>
                <div className="space-y-2">
                  <Label>Audience Overview</Label>
                  <Textarea {...form.register("documentationData.audience")} placeholder="Who is this project ultimately for?" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Project Timeline</Label>
                    <Input {...form.register("documentationData.timeline")} placeholder="e.g. Q3 2026" />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Budget</Label>
                    <Input {...form.register("documentationData.budget")} placeholder="e.g. $50,000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Testing & Success Metrics</Label>
                  <Textarea {...form.register("documentationData.successMetrics")} placeholder="Methods to test the solution and measure success..." />
                </div>
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={prevStep} disabled={step === 1}>Previous</Button>
          {step < 5 ? (
            <Button type="button" onClick={nextStep}>Next</Button>
          ) : (
            <Button type="button" onClick={() => saveToDb(form.getValues()).then(() => alert("Submitted successfully!"))}>
              Submit & Finalise RAD
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

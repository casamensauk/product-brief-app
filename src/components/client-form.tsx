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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import debounce from "lodash/debounce"

const formSchema = z.object({
  contextData: z.object({
    companyName: z.string().optional(),
    primaryContact: z.string().optional(),
    projectName: z.string().optional(),
    primaryGoal: z.string().optional(),
    projectType: z.string().optional()
  }).optional(),
  purposeData: z.object({
    problemStatement: z.string().optional(),
    targetAudience: z.string().optional(),
    valueProp: z.string().optional(),
    inclusiveDesign: z.string().optional(),
    jtbd: z.string().optional(),
    beforeAfter: z.string().optional(),
    businessDrivers: z.string().optional(),
    antiGoals: z.string().optional(),
    magicMoment: z.string().optional(),
  }).optional(),
  userRoles: z.object({
    requiresAuth: z.boolean().optional(),
    authMethods: z.array(z.string()).optional(),
    rolesDescription: z.string().optional()
  }).optional(),
  featureMatrix: z.array(z.object({
    name: z.string().min(1, "Feature name is required"),
    description: z.string().optional(),
    priority: z.string().optional()
  })).optional(),
  techRequirements: z.object({
    hosting: z.string().optional(),
    database: z.string().optional(),
    aiIntegrations: z.string().optional(),
    requiresMonetization: z.boolean().optional(),
    monetizationModel: z.string().optional(),
    thirdParty: z.string().optional()
  }).optional(),
  designData: z.object({
    brandGuidelines: z.string().optional(),
    uiUxVibe: z.string().optional(),
    mobileResponsiveness: z.string().optional()
  }).optional(),
  logisticsData: z.object({
    compliance: z.string().optional(),
    launchDate: z.string().optional(),
    deadlineType: z.string().optional(),
    budget: z.string().optional(),
    successMetrics: z.string().optional()
  }).optional(),
})

type FormData = z.infer<typeof formSchema>

export default function ClientForm({ initialData, token }: { initialData: any, token: string }) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      contextData: initialData?.contextData || {},
      purposeData: initialData?.purposeData || {},
      userRoles: initialData?.userRoles || { authMethods: [] },
      featureMatrix: initialData?.featureMatrix || [],
      techRequirements: initialData?.techRequirements || {},
      designData: initialData?.designData || {},
      logisticsData: initialData?.logisticsData || {}
    }
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "featureMatrix"
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

  const nextStep = () => setStep(s => Math.min(s + 1, 7))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Project Requirements Gathering</h1>
        <span className="text-sm text-muted-foreground">
          {isSaving ? "Saving..." : "Saved"} | Step {step} of 7
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "1. Client & Project Context"}
            {step === 2 && "2. Core Purpose & Target Audience"}
            {step === 3 && "3. User Roles & Permissions"}
            {step === 4 && "4. Functional Requirements & Feature Matrix"}
            {step === 5 && "5. Infrastructure, Tech Stack & Integrations"}
            {step === 6 && "6. Design & Branding"}
            {step === 7 && "7. Logistics, Compliance & Delivery"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Capturing basic administrative and high-level project details."}
            {step === 2 && "Understanding the 'why' and ensuring the application acts as an effective, low-friction tool."}
            {step === 3 && "Defining who has access to what."}
            {step === 4 && "Detailing exactly what the application needs to do."}
            {step === 5 && "Gathering technical prerequisites."}
            {step === 6 && "Ensuring visual and interactive elements align with your identity."}
            {step === 7 && "Establishing timelines, budgets, and legal constraints."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Company/Organization Name</Label>
                  <Input {...form.register("contextData.companyName")} />
                </div>
                <div className="space-y-2">
                  <Label>Primary Contact Name & Role</Label>
                  <Input {...form.register("contextData.primaryContact")} />
                </div>
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input {...form.register("contextData.projectName")} />
                </div>
                <div className="space-y-2">
                  <Label>What is the primary goal of this web application?</Label>
                  <Textarea {...form.register("contextData.primaryGoal")} />
                </div>
                <div className="space-y-2">
                  <Label>Is this a greenfield project or a rebuild?</Label>
                  <RadioGroup 
                    onValueChange={(val) => form.setValue("contextData.projectType", val)}
                    defaultValue={form.getValues("contextData.projectType")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Greenfield" id="greenfield" />
                      <Label htmlFor="greenfield">Greenfield (built from scratch)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Rebuild" id="rebuild" />
                      <Label htmlFor="rebuild">Rebuild/migration of an existing platform</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Integration" id="integration" />
                      <Label htmlFor="integration">Integration with existing app</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Problem Statement</Label>
                  <p className="text-xs text-muted-foreground">What specific friction or pain point does this solve?</p>
                  <Textarea {...form.register("purposeData.problemStatement")} />
                </div>
                <div className="space-y-2">
                  <Label>Target Audience</Label>
                  <p className="text-xs text-muted-foreground">Who are the primary users? (Demographics, technical proficiency, expected device usage)</p>
                  <Textarea {...form.register("purposeData.targetAudience")} />
                </div>
                <div className="space-y-2">
                  <Label>Value Proposition</Label>
                  <p className="text-xs text-muted-foreground">How does this app streamline users' daily workflows or routines?</p>
                  <Textarea {...form.register("purposeData.valueProp")} />
                </div>
                <div className="space-y-2">
                  <Label>Inclusive Design Requirements</Label>
                  <Textarea {...form.register("purposeData.inclusiveDesign")} placeholder="e.g. WCAG 2.1 AA..." />
                </div>
                <hr />
                <div className="space-y-2">
                  <Label>The "Job to be Done" (JTBD)</Label>
                  <p className="text-xs text-muted-foreground">When a user opens this app, what specific task are they "hiring" it to do?</p>
                  <Textarea {...form.register("purposeData.jtbd")} />
                </div>
                <div className="space-y-2">
                  <Label>The "Before & After" State</Label>
                  <p className="text-xs text-muted-foreground">Before: Describe current friction. After: What does the ideal workflow look like?</p>
                  <Textarea {...form.register("purposeData.beforeAfter")} />
                </div>
                <div className="space-y-2">
                  <Label>Core Business Drivers</Label>
                  <p className="text-xs text-muted-foreground">Why is your business investing in this now?</p>
                  <Textarea {...form.register("purposeData.businessDrivers")} />
                </div>
                <div className="space-y-2">
                  <Label>The "Anti-Goals" (Out of Scope)</Label>
                  <p className="text-xs text-muted-foreground">What should this application explicitly never do?</p>
                  <Textarea {...form.register("purposeData.antiGoals")} />
                </div>
                <div className="space-y-2">
                  <Label>The "Magic" Moment</Label>
                  <p className="text-xs text-muted-foreground">What is the specific interaction or result that will make the user realize its value instantly?</p>
                  <Textarea {...form.register("purposeData.magicMoment")} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="reqAuth" 
                    checked={form.watch("userRoles.requiresAuth")}
                    onCheckedChange={(c) => form.setValue("userRoles.requiresAuth", c as boolean)}
                  />
                  <Label htmlFor="reqAuth">Will the application require user authentication?</Label>
                </div>
                
                {form.watch("userRoles.requiresAuth") && (
                  <div className="space-y-4 pl-6">
                    <Label>Preferred authentication methods:</Label>
                    <div className="space-y-2">
                      {["Email / Password", "Social Logins (Google, Apple, GitHub)", "Enterprise SSO (SAML, OAuth)", "Passwordless (Magic Links / OTP)"].map((method) => (
                        <div className="flex items-center space-x-2" key={method}>
                          <Checkbox 
                            id={`auth-${method}`}
                            checked={form.watch("userRoles.authMethods")?.includes(method)}
                            onCheckedChange={(checked) => {
                              const current = form.getValues("userRoles.authMethods") || []
                              if (checked) {
                                form.setValue("userRoles.authMethods", [...current, method])
                              } else {
                                form.setValue("userRoles.authMethods", current.filter(m => m !== method))
                              }
                            }}
                          />
                          <Label htmlFor={`auth-${method}`}>{method}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Define distinct user roles & permissions</Label>
                  <p className="text-xs text-muted-foreground">e.g., Admin, Standard User, Guest</p>
                  <Textarea {...form.register("userRoles.rolesDescription")} className="h-40" />
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">Please list the core features and categorize their priority (Must-have, Should-have, Nice-to-have).</p>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border p-4 rounded-md">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label>Feature Name</Label>
                        <Input {...form.register(`featureMatrix.${index}.name`)} placeholder="e.g. User Dashboard" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea {...form.register(`featureMatrix.${index}.description`)} placeholder="Aggregated view of daily tasks and analytics." />
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input {...form.register(`featureMatrix.${index}.priority`)} placeholder="Must-have / Should-have / Nice-to-have" />
                      </div>
                    </div>
                    <Button type="button" variant="destructive" onClick={() => remove(index)}>Remove</Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ name: "", description: "", priority: "" })}>
                  Add Feature
                </Button>
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Hosting & Deployment</Label>
                  <Textarea {...form.register("techRequirements.hosting")} placeholder="Do you have preferred cloud infrastructure?" />
                </div>
                <div className="space-y-2">
                  <Label>Database & Storage</Label>
                  <Textarea {...form.register("techRequirements.database")} placeholder="Anticipated data storage needs?" />
                </div>
                <div className="space-y-2">
                  <Label>AI Integrations</Label>
                  <Textarea {...form.register("techRequirements.aiIntegrations")} placeholder="Will the platform require LLM integration?" />
                </div>
                <div className="flex items-center space-x-2 mt-6">
                  <Checkbox 
                    id="reqMonetize" 
                    checked={form.watch("techRequirements.requiresMonetization")}
                    onCheckedChange={(c) => form.setValue("techRequirements.requiresMonetization", c as boolean)}
                  />
                  <Label htmlFor="reqMonetize">Does the application require payment processing?</Label>
                </div>
                {form.watch("techRequirements.requiresMonetization") && (
                  <div className="space-y-2 pl-6">
                    <Label>Please describe the pricing model:</Label>
                    <Textarea {...form.register("techRequirements.monetizationModel")} placeholder="Subscriptions, one-off..." />
                  </div>
                )}
                <div className="space-y-2 mt-4">
                  <Label>Third-Party APIs</Label>
                  <Textarea {...form.register("techRequirements.thirdParty")} placeholder="List external services the app must integrate with..." />
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Do you have an existing brand guideline?</Label>
                  <RadioGroup 
                    onValueChange={(val) => form.setValue("designData.brandGuidelines", val)}
                    defaultValue={form.getValues("designData.brandGuidelines")}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Yes" id="brand-yes" />
                      <Label htmlFor="brand-yes">Yes, ready to upload</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Partial" id="brand-partial" />
                      <Label htmlFor="brand-partial">Partial</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="No" id="brand-no" />
                      <Label htmlFor="brand-no">No, needs creation</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>UI/UX Vibe</Label>
                  <p className="text-xs text-muted-foreground">How should the application feel to the user?</p>
                  <Textarea {...form.register("designData.uiUxVibe")} placeholder="Corporate & structured, playful & energetic..." />
                </div>
                <div className="space-y-2">
                  <Label>Mobile Responsiveness</Label>
                  <p className="text-xs text-muted-foreground">Strictly web-based or PWA native feel?</p>
                  <Textarea {...form.register("designData.mobileResponsiveness")} />
                </div>
              </div>
            )}

            {step === 7 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Regulatory compliance requirements</Label>
                  <Textarea {...form.register("logisticsData.compliance")} placeholder="GDPR, HIPAA, financial data..." />
                </div>
                <div className="space-y-2">
                  <Label>Target Launch Date</Label>
                  <Input type="date" {...form.register("logisticsData.launchDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Is this a hard deadline or soft target?</Label>
                  <Textarea {...form.register("logisticsData.deadlineType")} />
                </div>
                <div className="space-y-2">
                  <Label>Project Budget Range</Label>
                  <select 
                    {...form.register("logisticsData.budget")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select a range...</option>
                    <option value="<$10k">Under $10,000</option>
                    <option value="$10k-$25k">$10,000 - $25,000</option>
                    <option value="$25k-$50k">$25,000 - $50,000</option>
                    <option value="$50k-$100k">$50,000 - $100,000</option>
                    <option value=">$100k">Over $100,000</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Success Metrics</Label>
                  <p className="text-xs text-muted-foreground">How will you measure success 6 months post-launch?</p>
                  <Textarea {...form.register("logisticsData.successMetrics")} />
                </div>
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={prevStep} disabled={step === 1}>Previous</Button>
          {step < 7 ? (
            <Button type="button" onClick={nextStep}>Next</Button>
          ) : (
            <Button type="button" onClick={() => saveToDb(form.getValues()).then(() => alert("Submitted successfully!"))}>
              Submit
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

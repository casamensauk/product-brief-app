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
import debounce from "lodash/debounce"

const formSchema = z.object({
  purposeData: z.object({
    jtbd: z.string().optional(),
    beforeAfter: z.string().optional(),
    businessDrivers: z.string().optional(),
    antiGoals: z.string().optional(),
  }).optional(),
  featureMatrix: z.array(z.object({
    name: z.string().min(1, "Feature name is required"),
    description: z.string().optional(),
    priority: z.string().optional()
  })).optional(),
  techRequirements: z.object({
    hosting: z.string().optional(),
    database: z.string().optional(),
    thirdParty: z.string().optional()
  }).optional(),
  userRoles: z.string().optional()
})

type FormData = z.infer<typeof formSchema>

export default function ClientForm({ initialData, token }: { initialData: any, token: string }) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purposeData: initialData?.purposeData || {},
      featureMatrix: initialData?.featureMatrix || [],
      techRequirements: initialData?.techRequirements || {},
      userRoles: initialData?.userRoles || ""
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

  const nextStep = () => setStep(s => Math.min(s + 1, 4))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Project Requirements Gathering</h1>
        <span className="text-sm text-muted-foreground">
          {isSaving ? "Saving..." : "Saved"} | Step {step} of 4
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "Deep Purpose & Vision"}
            {step === 2 && "User Roles & Authentication Needs"}
            {step === 3 && "Feature Matrix"}
            {step === 4 && "Tech Stack & Integrations"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Let's define the core problem and the 'Job To Be Done'."}
            {step === 2 && "Who will be using this system?"}
            {step === 3 && "List out the major features needed."}
            {step === 4 && "Any specific technical preferences?"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Job to be Done (JTBD)</Label>
                  <Textarea {...form.register("purposeData.jtbd")} placeholder="When [situation], I want to [motivation], so I can [expected outcome]." />
                </div>
                <div className="space-y-2">
                  <Label>Before & After States</Label>
                  <Textarea {...form.register("purposeData.beforeAfter")} placeholder="How is it done now? How will it be done after?" />
                </div>
                <div className="space-y-2">
                  <Label>Business Drivers</Label>
                  <Textarea {...form.register("purposeData.businessDrivers")} placeholder="Increase revenue, reduce costs, save time..." />
                </div>
                <div className="space-y-2">
                  <Label>Anti-Goals</Label>
                  <Textarea {...form.register("purposeData.antiGoals")} placeholder="What are we explicitly NOT building?" />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>User Roles Description</Label>
                  <Textarea {...form.register("userRoles")} placeholder="Describe the types of users (e.g. Admin, Customer, Guest)" className="h-40" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start border p-4 rounded-md">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label>Feature Name</Label>
                        <Input {...form.register(`featureMatrix.${index}.name`)} placeholder="e.g. User Profile" />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea {...form.register(`featureMatrix.${index}.description`)} placeholder="What does this feature do?" />
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Input {...form.register(`featureMatrix.${index}.priority`)} placeholder="High, Medium, Low" />
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

            {step === 4 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Hosting Preferences</Label>
                  <Input {...form.register("techRequirements.hosting")} placeholder="e.g. Vercel, Railway, AWS" />
                </div>
                <div className="space-y-2">
                  <Label>Database Needs</Label>
                  <Input {...form.register("techRequirements.database")} placeholder="e.g. Postgres, MongoDB" />
                </div>
                <div className="space-y-2">
                  <Label>Third-Party Integrations</Label>
                  <Textarea {...form.register("techRequirements.thirdParty")} placeholder="e.g. Stripe, SendGrid, OpenAI" />
                </div>
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={step === 1}>Previous</Button>
          {step < 4 ? (
            <Button onClick={nextStep}>Next</Button>
          ) : (
            <Button onClick={() => saveToDb(form.getValues()).then(() => alert("Submitted successfully!"))}>
              Submit
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

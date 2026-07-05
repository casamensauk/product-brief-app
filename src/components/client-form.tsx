"use client"
import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import debounce from "lodash/debounce"

const formSchema = z.object({
  rawClientAnswers: z.object({
    aboutCompany: z.string().optional(),
    primaryProblem: z.string().optional(),
    targetUsers: z.string().optional(),
    mustHaveFeatures: z.string().optional(),
    designInspiration: z.string().optional(),
    logistics: z.string().optional()
  }).optional()
})

type FormData = z.infer<typeof formSchema>

export default function ClientForm({ initialData, token }: { initialData: any, token: string }) {
  const [step, setStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawClientAnswers: initialData?.rawClientAnswers || {}
    }
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

  const nextStep = () => setStep(s => Math.min(s + 1, 6))
  const prevStep = () => setStep(s => Math.max(s - 1, 1))

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Project Discovery Questionnaire</h1>
        <span className="text-sm text-muted-foreground">
          {isSaving ? "Saving..." : "Saved"} | Step {step} of 6
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {step === 1 && "1. About You"}
            {step === 2 && "2. The Goal"}
            {step === 3 && "3. Your Users"}
            {step === 4 && "4. Core Features"}
            {step === 5 && "5. Design & Vision"}
            {step === 6 && "6. Timeline & Budget"}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Tell us a bit about your company and what you do."}
            {step === 2 && "What is the primary problem you're trying to solve with this software?"}
            {step === 3 && "Who will be using this application?"}
            {step === 4 && "What features or pages do you absolutely need to have?"}
            {step === 5 && "Do you have any design inspiration, brand guidelines, or links to wireframes?"}
            {step === 6 && "When do you need this launched, and what is your expected budget?"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6">
            {step === 1 && (
              <div className="space-y-4">
                <Label>Who are you and what does your company do?</Label>
                <Textarea 
                  {...form.register("rawClientAnswers.aboutCompany")} 
                  className="min-h-[150px]"
                  placeholder="e.g. My name is Jane, and I run a logistics startup that helps local bakeries deliver fresh bread..." 
                />
              </div>
            )}
            {step === 2 && (
              <div className="space-y-4">
                <Label>What is the main problem you want to solve?</Label>
                <Textarea 
                  {...form.register("rawClientAnswers.primaryProblem")} 
                  className="min-h-[150px]"
                  placeholder="e.g. We currently track all deliveries on paper, which leads to lost orders and angry customers..." 
                />
              </div>
            )}
            {step === 3 && (
              <div className="space-y-4">
                <Label>Who will use this application?</Label>
                <Textarea 
                  {...form.register("rawClientAnswers.targetUsers")} 
                  className="min-h-[150px]"
                  placeholder="e.g. Our delivery drivers will use it on their phones, and the bakery managers will use it on their computers..." 
                />
              </div>
            )}
            {step === 4 && (
              <div className="space-y-4">
                <Label>What are the must-have features?</Label>
                <Textarea 
                  {...form.register("rawClientAnswers.mustHaveFeatures")} 
                  className="min-h-[150px]"
                  placeholder="e.g. We absolutely need a map view for drivers, and a calendar view for managers. It would also be nice to have SMS notifications..." 
                />
              </div>
            )}
            {step === 5 && (
              <div className="space-y-4">
                <Label>Do you have any design inspiration or existing assets?</Label>
                <Textarea 
                  {...form.register("rawClientAnswers.designInspiration")} 
                  className="min-h-[150px]"
                  placeholder="e.g. We love the clean look of Stripe. Here is a link to our logo and some rough sketches on Miro: https://miro.com/..." 
                />
              </div>
            )}
            {step === 6 && (
              <div className="space-y-4">
                <Label>What is your timeline and budget?</Label>
                <Textarea 
                  {...form.register("rawClientAnswers.logistics")} 
                  className="min-h-[150px]"
                  placeholder="e.g. We are hoping to launch a beta in 3 months. Our budget is around $25,000..." 
                />
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={prevStep} disabled={step === 1}>Previous</Button>
          {step < 6 ? (
            <Button type="button" onClick={nextStep}>Next</Button>
          ) : (
            <Button type="button" onClick={() => saveToDb(form.getValues()).then(() => alert("Submitted successfully!"))}>
              Submit Questionnaire
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

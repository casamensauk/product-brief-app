import { describe, expect, it } from "vitest"
import { productBriefSchema, questionSchema } from "@/lib/schemas"

describe("productBriefSchema", () => {
  it("fills every field with a safe default when given an empty object", () => {
    const brief = productBriefSchema.parse({})
    expect(brief.executiveSummary).toBe("")
    expect(brief.goals).toEqual([])
    expect(brief.requirements).toEqual([])
    expect(brief.scope).toEqual({ inScope: [], outOfScope: [] })
  })

  it("coerces invalid requirement category/priority to defaults", () => {
    const brief = productBriefSchema.parse({
      requirements: [{ name: "Map", category: "Bogus", priority: "Nope" }],
    })
    expect(brief.requirements[0]).toEqual({
      name: "Map",
      description: "",
      category: "Functional",
      priority: "Should-have",
    })
  })

  it("recovers a whole malformed section without discarding the brief", () => {
    const brief = productBriefSchema.parse({
      executiveSummary: "Fine",
      goals: "not-an-array",
    })
    expect(brief.executiveSummary).toBe("Fine")
    expect(brief.goals).toEqual([])
  })
})

describe("questionSchema", () => {
  const base = { id: "q1", label: "Pick one", required: false }

  it("rejects a select question with fewer than two options", () => {
    expect(questionSchema.safeParse({ ...base, type: "single_select" }).success).toBe(false)
    expect(
      questionSchema.safeParse({ ...base, type: "single_select", options: ["only"] }).success
    ).toBe(false)
  })

  it("accepts a select question with two or more options", () => {
    expect(
      questionSchema.safeParse({ ...base, type: "single_select", options: ["a", "b"] }).success
    ).toBe(true)
  })

  it("accepts a text question without options", () => {
    expect(questionSchema.safeParse({ ...base, type: "long_text" }).success).toBe(true)
  })
})

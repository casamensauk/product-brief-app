import { describe, expect, it } from "vitest"
import { clientLinksSchema } from "@/lib/schemas"
import { buildTranscript, nextQuestionResponseSchema, seedQuestion } from "@/lib/interview"

describe("nextQuestionResponseSchema", () => {
  it("parses a full valid response", () => {
    const result = nextQuestionResponseSchema.parse({
      done: false,
      question: {
        label: "What is your budget?",
        helpText: "A rough range is fine.",
        placeholder: "e.g. $10k-20k",
        type: "short_text",
        required: true,
      },
      coveredAreas: ["company background"],
    })
    expect(result.done).toBe(false)
    expect(result.question?.label).toBe("What is your budget?")
    expect(result.coveredAreas).toEqual(["company background"])
  })

  it("coerces an invalid question type to long_text", () => {
    const result = nextQuestionResponseSchema.parse({
      done: false,
      question: { label: "Pick one", type: "bogus_type" },
      coveredAreas: [],
    })
    expect(result.question?.type).toBe("long_text")
  })

  it("defaults done to false on garbage input", () => {
    const result = nextQuestionResponseSchema.parse({ done: "not-a-boolean" })
    expect(result.done).toBe(false)
  })

  it("catches coveredAreas to an empty array when malformed", () => {
    const result = nextQuestionResponseSchema.parse({ done: true, coveredAreas: "not-an-array" })
    expect(result.coveredAreas).toEqual([])
  })
})

describe("clientLinksSchema", () => {
  it("accepts an https URL without a label", () => {
    const result = clientLinksSchema.safeParse([{ url: "https://example.com" }])
    expect(result.success).toBe(true)
  })

  it("accepts an http URL with a label", () => {
    const result = clientLinksSchema.safeParse([
      { url: "http://example.com/brand", label: "Brand guidelines" },
    ])
    expect(result.success).toBe(true)
  })

  it("rejects a javascript: URL", () => {
    const result = clientLinksSchema.safeParse([{ url: "javascript:alert(1)" }])
    expect(result.success).toBe(false)
  })

  it("rejects an ftp: URL", () => {
    const result = clientLinksSchema.safeParse([{ url: "ftp://example.com/file" }])
    expect(result.success).toBe(false)
  })

  it("rejects plain text", () => {
    const result = clientLinksSchema.safeParse([{ url: "not a url" }])
    expect(result.success).toBe(false)
  })

  it("rejects more than 10 links", () => {
    const links = Array.from({ length: 11 }, (_, i) => ({ url: `https://example.com/${i}` }))
    const result = clientLinksSchema.safeParse(links)
    expect(result.success).toBe(false)
  })
})

describe("buildTranscript", () => {
  const questions = [
    { id: "q1", label: "What do you do?", type: "long_text" as const, required: true },
    {
      id: "q2",
      label: "Pick features",
      type: "multi_select" as const,
      required: false,
      options: ["A", "B"],
    },
  ]

  it("marks unanswered questions as (not answered)", () => {
    const transcript = buildTranscript(questions, {})
    expect(transcript).toContain("Q: What do you do?\nA: (not answered)")
  })

  it("joins array answers with a comma", () => {
    const transcript = buildTranscript(questions, { q2: ["A", "B"] })
    expect(transcript).toContain("Q: Pick features\nA: A, B")
  })
})

describe("seedQuestion", () => {
  it("returns a required long_text question", () => {
    const question = seedQuestion()
    expect(question.type).toBe("long_text")
    expect(question.required).toBe(true)
    expect(question.label.length).toBeGreaterThan(0)
  })

  it("returns a fresh id each call", () => {
    const a = seedQuestion()
    const b = seedQuestion()
    expect(a.id).not.toBe(b.id)
  })
})

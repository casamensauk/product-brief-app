import { describe, expect, it } from "vitest"
import { missingRequired, parseQuestions, sanitizeAnswers } from "@/lib/answers"
import { DEFAULT_QUESTIONS } from "@/lib/templates"
import type { Question } from "@/lib/schemas"

const q = (over: Partial<Question> & Pick<Question, "id" | "type">): Question => ({
  label: "Q",
  required: false,
  ...over,
})

describe("parseQuestions", () => {
  it("returns a valid questions array unchanged", () => {
    const questions = [q({ id: "x", type: "short_text", label: "Name" })]
    expect(parseQuestions(questions)).toEqual(questions)
  })

  it("falls back to the default template for null/invalid input", () => {
    expect(parseQuestions(null)).toBe(DEFAULT_QUESTIONS)
    expect(parseQuestions([])).toBe(DEFAULT_QUESTIONS) // min(1) fails
    expect(parseQuestions([{ nope: true }])).toBe(DEFAULT_QUESTIONS)
  })
})

describe("sanitizeAnswers", () => {
  const questions: Question[] = [
    q({ id: "text", type: "long_text" }),
    q({ id: "one", type: "single_select", options: ["a", "b"] }),
    q({ id: "many", type: "multi_select", options: ["x", "y"] }),
  ]

  it("drops answers for unknown question ids", () => {
    expect(sanitizeAnswers(questions, { ghost: "hi", text: "keep" })).toEqual({
      text: "keep",
    })
  })

  it("keeps single-select only when the value is a known option (or empty)", () => {
    expect(sanitizeAnswers(questions, { one: "a" })).toEqual({ one: "a" })
    expect(sanitizeAnswers(questions, { one: "" })).toEqual({ one: "" })
    expect(sanitizeAnswers(questions, { one: "z" })).toEqual({})
  })

  it("filters multi-select values down to known options", () => {
    expect(sanitizeAnswers(questions, { many: ["x", "bogus", "y"] })).toEqual({
      many: ["x", "y"],
    })
  })

  it("drops values whose shape doesn't match the question type", () => {
    expect(sanitizeAnswers(questions, { text: ["array", "for", "text"] })).toEqual({})
    expect(sanitizeAnswers(questions, { many: "string-for-multi" })).toEqual({})
  })
})

describe("missingRequired", () => {
  const questions: Question[] = [
    q({ id: "req1", type: "short_text", required: true, label: "Company" }),
    q({ id: "req2", type: "multi_select", required: true, label: "Platforms", options: ["a"] }),
    q({ id: "opt", type: "short_text", required: false, label: "Notes" }),
  ]

  it("reports required questions with no usable answer", () => {
    expect(missingRequired(questions, {})).toEqual(["Company", "Platforms"])
  })

  it("treats whitespace-only and empty arrays as missing", () => {
    expect(missingRequired(questions, { req1: "   ", req2: [] })).toEqual([
      "Company",
      "Platforms",
    ])
  })

  it("passes when all required questions are answered", () => {
    expect(missingRequired(questions, { req1: "Acme", req2: ["a"] })).toEqual([])
  })
})

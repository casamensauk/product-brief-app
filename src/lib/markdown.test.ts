import { describe, expect, it } from "vitest"
import { productBriefToMarkdown } from "@/lib/markdown"
import { productBriefSchema } from "@/lib/schemas"

const briefWith = (over: Record<string, unknown>) => productBriefSchema.parse(over)

describe("productBriefToMarkdown", () => {
  it("escapes pipes and flattens newlines in the requirements table", () => {
    const md = productBriefToMarkdown({
      clientName: "Acme",
      projectName: "App",
      brief: briefWith({
        requirements: [
          {
            name: "A | B",
            description: "line one\nline two",
            category: "Functional",
            priority: "Must-have",
          },
        ],
      }),
      questions: [],
      answers: {},
    })
    expect(md).toContain("| A \\| B | Functional | Must-have | line one line two |")
    expect(md).not.toContain("line one\nline two")
  })

  it("omits sections that have no content", () => {
    const md = productBriefToMarkdown({
      clientName: "Acme",
      projectName: "App",
      brief: briefWith({ executiveSummary: "A summary." }),
      questions: [],
      answers: {},
    })
    expect(md).toContain("## Executive summary")
    // Empty arrays/strings should not produce their headings.
    expect(md).not.toContain("## Goals")
    expect(md).not.toContain("## Requirements")
    expect(md).not.toContain("## Timeline")
  })

  it("includes the client questionnaire answers appendix when answers exist", () => {
    const md = productBriefToMarkdown({
      clientName: "Acme",
      projectName: null,
      brief: briefWith({ executiveSummary: "x" }),
      questions: [{ id: "q1", label: "About you", type: "long_text", required: false }],
      answers: { q1: "We bake bread." },
    })
    expect(md).toContain("## Appendix: client questionnaire answers")
    expect(md).toContain("**About you**")
    expect(md).toContain("We bake bread.")
  })
})

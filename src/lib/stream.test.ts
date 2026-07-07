import { describe, expect, it } from "vitest"
import { detectNewSections, extractDeltaContent, parseSSELines } from "@/lib/stream"

describe("parseSSELines", () => {
  it("extracts complete data: payloads and keeps the trailing partial line", () => {
    const { payloads, rest } = parseSSELines('data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c')
    expect(payloads).toEqual(['{"a":1}', '{"b":2}'])
    expect(rest).toBe('data: {"c')
  })

  it("ignores non-data lines", () => {
    const { payloads } = parseSSELines(": comment\ndata: hi\nevent: x\n")
    expect(payloads).toEqual(["hi"])
  })
})

describe("extractDeltaContent", () => {
  it("returns the delta content string", () => {
    const payload = JSON.stringify({ choices: [{ delta: { content: "chunk" } }] })
    expect(extractDeltaContent(payload)).toBe("chunk")
  })

  it("returns null for [DONE], empty, and malformed payloads", () => {
    expect(extractDeltaContent("[DONE]")).toBeNull()
    expect(extractDeltaContent("")).toBeNull()
    expect(extractDeltaContent("{not json")).toBeNull()
    expect(extractDeltaContent(JSON.stringify({ choices: [{ delta: {} }] }))).toBeNull()
  })
})

describe("detectNewSections", () => {
  it("detects a section only when used as a JSON key, and only once", () => {
    const seen = new Set<string>()
    expect(detectNewSections('{"executiveSummary":', seen)).toEqual(["executiveSummary"])
    // Same text again yields nothing new.
    expect(detectNewSections('{"executiveSummary": "..."}', seen)).toEqual([])
  })

  it("does not match a section name mentioned in prose (no colon)", () => {
    const seen = new Set<string>()
    // "budget" appears inside a value, not as a key.
    expect(detectNewSections('{"executiveSummary": "mind the budget"', seen)).toEqual([
      "executiveSummary",
    ])
    expect(seen.has("budget")).toBe(false)
  })

  it("does not confuse scope with inScope/outOfScope", () => {
    const seen = new Set<string>()
    detectNewSections('{"scope": {"inScope": [], "outOfScope": []}}', seen)
    expect(seen.has("scope")).toBe(true)
    // inScope/outOfScope are not top-level sections and must not be reported.
    expect([...seen]).toEqual(["scope"])
  })
})

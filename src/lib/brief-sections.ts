import type { ProductBrief } from "@/lib/schemas"

export type SectionKind =
  | "string"
  | "stringList"
  | "scope"
  | "targetUsers"
  | "stakeholders"
  | "risks"
  | "requirements"

export type BriefSectionKey = keyof ProductBrief

export type BriefSection = {
  key: BriefSectionKey
  label: string
  kind: SectionKind
}

// Canonical order + labels + edit shape for every product-brief section.
// Single source of truth for the view, the section editors, the regeneration
// endpoint, and the streaming progress checklist.
export const BRIEF_SECTIONS: BriefSection[] = [
  { key: "executiveSummary", label: "Executive summary", kind: "string" },
  { key: "problemStatement", label: "Problem statement", kind: "string" },
  { key: "goals", label: "Goals", kind: "stringList" },
  { key: "targetUsers", label: "Target users", kind: "targetUsers" },
  { key: "stakeholders", label: "Stakeholders", kind: "stakeholders" },
  { key: "userStories", label: "User stories", kind: "stringList" },
  { key: "requirements", label: "Requirements", kind: "requirements" },
  { key: "scope", label: "Scope", kind: "scope" },
  { key: "assumptions", label: "Assumptions", kind: "stringList" },
  { key: "risks", label: "Risks", kind: "risks" },
  { key: "openQuestions", label: "Open questions for the client", kind: "stringList" },
  { key: "timeline", label: "Timeline", kind: "string" },
  { key: "budget", label: "Budget", kind: "string" },
  { key: "successMetrics", label: "Success metrics", kind: "stringList" },
]

export const BRIEF_SECTION_KEYS = BRIEF_SECTIONS.map((s) => s.key)

export function sectionLabel(key: string): string {
  return BRIEF_SECTIONS.find((s) => s.key === key)?.label ?? key
}

/** Shape hint shown to the model for a single-section regeneration. */
export const SECTION_JSON_SHAPES: Record<BriefSectionKey, string> = {
  executiveSummary: `"executiveSummary": "string (3-5 sentences)"`,
  problemStatement: `"problemStatement": "string"`,
  goals: `"goals": ["string"]`,
  targetUsers: `"targetUsers": [{ "persona": "string", "description": "string" }]`,
  stakeholders: `"stakeholders": [{ "name": "string", "role": "string", "interest": "string" }]`,
  userStories: `"userStories": ["As a <user>, I want <capability>, so that <benefit>"]`,
  requirements: `"requirements": [{ "name": "string", "description": "string", "category": "Functional|Non-functional|Technical|Operational|Transitional", "priority": "Must-have|Should-have|Nice-to-have" }]`,
  scope: `"scope": { "inScope": ["string"], "outOfScope": ["string"] }`,
  assumptions: `"assumptions": ["string"]`,
  risks: `"risks": [{ "risk": "string", "mitigation": "string" }]`,
  openQuestions: `"openQuestions": ["string"]`,
  timeline: `"timeline": "string"`,
  budget: `"budget": "string"`,
  successMetrics: `"successMetrics": ["string"]`,
}

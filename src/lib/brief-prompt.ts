import type { Answers, Question } from "@/lib/schemas"
import { SECTION_JSON_SHAPES, sectionLabel, type BriefSectionKey } from "@/lib/brief-sections"

export const BRIEF_SYSTEM_PROMPT = `You are an expert business analyst and product strategist at a software agency.
You turn raw client discovery answers into rigorous, actionable product briefs.
You always respond with a single valid JSON object and nothing else.
Never invent facts: where the client did not provide information, say so explicitly (e.g. "Not specified — clarify with client") or list it under openQuestions.`

/** The answered questions rendered as "Q: … / A: …" blocks, or null if none. */
export function answeredContext(questions: Question[], answers: Answers): string | null {
  const answered = questions
    .map((q) => {
      const value = answers[q.id]
      const text = Array.isArray(value) ? value.join(", ") : value?.trim()
      return text ? `Q: ${q.label}\nA: ${text}` : null
    })
    .filter(Boolean)
  return answered.length > 0 ? answered.join("\n\n") : null
}

function metadataBlock(clientName: string, projectName: string | null): string {
  return `Project metadata:
- Client: ${clientName}
- Project: ${projectName || "(not specified)"}`
}

export function buildFullBriefPrompt(options: {
  clientName: string
  projectName: string | null
  context: string
}): string {
  return `Create a complete product brief from this client discovery questionnaire.

${metadataBlock(options.clientName, options.projectName)}

Questionnaire answers:
${options.context}

Instructions:
- Base everything strictly on the answers above. Flag gaps rather than inventing details.
- requirements: extract every explicit or clearly implied requirement, categorised (Functional | Non-functional | Technical | Operational | Transitional) and prioritised with MoSCoW (Must-have | Should-have | Nice-to-have).
- userStories: written as "As a <user>, I want <capability>, so that <benefit>".
- scope.outOfScope: things adjacent to the request that are explicitly or implicitly excluded from a first version.
- risks: real delivery risks for this specific project, each with a mitigation.
- openQuestions: concrete questions the agency should ask the client next.
- executiveSummary: 3-5 sentences a stakeholder could read in isolation.

Return JSON in exactly this shape:
{
  "executiveSummary": "string",
  "problemStatement": "string",
  "goals": ["string"],
  "targetUsers": [{ "persona": "string", "description": "string" }],
  "stakeholders": [{ "name": "string", "role": "string", "interest": "string" }],
  "userStories": ["string"],
  "requirements": [{ "name": "string", "description": "string", "category": "Functional|Non-functional|Technical|Operational|Transitional", "priority": "Must-have|Should-have|Nice-to-have" }],
  "scope": { "inScope": ["string"], "outOfScope": ["string"] },
  "assumptions": ["string"],
  "risks": [{ "risk": "string", "mitigation": "string" }],
  "openQuestions": ["string"],
  "timeline": "string",
  "budget": "string",
  "successMetrics": ["string"]
}`
}

export function buildSectionPrompt(options: {
  clientName: string
  projectName: string | null
  context: string
  section: BriefSectionKey
}): string {
  return `Regenerate ONLY the "${options.section}" (${sectionLabel(options.section)}) section of a product brief, from this client discovery questionnaire.

${metadataBlock(options.clientName, options.projectName)}

Questionnaire answers:
${options.context}

Instructions:
- Base everything strictly on the answers above. Flag gaps rather than inventing details.
- Return a JSON object containing ONLY the "${options.section}" key and nothing else.

Return JSON in exactly this shape:
{
  ${SECTION_JSON_SHAPES[options.section]}
}`
}

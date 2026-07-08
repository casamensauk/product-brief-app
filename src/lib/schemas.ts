import * as z from "zod"

// ---------------------------------------------------------------------------
// Questionnaire
// ---------------------------------------------------------------------------

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_select",
  "multi_select",
] as const

export const questionTypeSchema = z.enum(QUESTION_TYPES)
export type QuestionType = z.infer<typeof questionTypeSchema>

export const questionSchema = z
  .object({
    id: z.string().min(1).max(64),
    label: z.string().min(1).max(500),
    helpText: z.string().max(1000).optional(),
    placeholder: z.string().max(500).optional(),
    type: questionTypeSchema,
    options: z.array(z.string().min(1).max(200)).max(20).optional(),
    required: z.boolean(),
  })
  .superRefine((q, ctx) => {
    const needsOptions = q.type === "single_select" || q.type === "multi_select"
    if (needsOptions && (!q.options || q.options.length < 2)) {
      ctx.addIssue({
        code: "custom",
        message: `"${q.label}" needs at least two options`,
        path: ["options"],
      })
    }
  })

export type Question = z.infer<typeof questionSchema>

export const questionsSchema = z.array(questionSchema).min(1).max(50)

/** Client answers keyed by question id. */
export const answersSchema = z.record(
  z.string().max(64),
  z.union([z.string().max(20000), z.array(z.string().max(500)).max(20)])
)

export type Answers = z.infer<typeof answersSchema>

// ---------------------------------------------------------------------------
// Brief metadata (dashboard-editable fields)
// ---------------------------------------------------------------------------

/**
 * How the client questionnaire is driven: a fixed list of questions, or an
 * AI-guided interview that picks each next question from the answers so far.
 */
export const briefModeSchema = z.enum(["STATIC", "ADAPTIVE"])

export const createBriefSchema = z.object({
  clientName: z.string().trim().min(1, "Client name is required").max(200),
  projectName: z.string().trim().max(200).optional(),
  contactEmail: z
    .union([z.literal(""), z.email("Enter a valid email")])
    .optional(),
  // Id of a saved QuestionnaireTemplate to seed the questions from. Omitted
  // (or "default") uses the built-in default questionnaire.
  templateId: z.string().min(1).optional(),
  mode: briefModeSchema.optional(),
})

export const updateBriefSchema = z.object({
  clientName: z.string().trim().min(1).max(200).optional(),
  projectName: z.string().trim().max(200).nullable().optional(),
  contactEmail: z.union([z.literal(""), z.email()]).nullable().optional(),
  status: z.enum(["DRAFT", "SUBMITTED", "REVIEWED", "SCOPED"]).optional(),
  questions: questionsSchema.optional(),
})

// ---------------------------------------------------------------------------
// Questionnaire templates
// ---------------------------------------------------------------------------

export const createTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required").max(200),
  questions: questionsSchema,
})

export const followUpSchema = z.object({
  questions: z.array(z.string().trim().min(1).max(500)).min(1).max(10),
})

export const shareBriefSchema = z.object({
  action: z.enum(["enable", "rotate", "disable"]),
})

export const updateSettingsSchema = z.object({
  agencyName: z.string().trim().min(1, "Agency name is required").max(200),
  logoUrl: z
    .union([z.literal(""), z.url().max(2000).startsWith("https://", "Use an https:// URL")])
    .optional(),
})

// ---------------------------------------------------------------------------
// AI-generated product brief
// ---------------------------------------------------------------------------

const str = z.string().catch("")
const strList = z.array(z.string()).catch([])

export const requirementSchema = z.object({
  name: str,
  description: str,
  category: z
    .enum(["Functional", "Non-functional", "Technical", "Operational", "Transitional"])
    .catch("Functional"),
  priority: z.enum(["Must-have", "Should-have", "Nice-to-have"]).catch("Should-have"),
})

export const productBriefSchema = z.object({
  executiveSummary: str,
  problemStatement: str,
  goals: strList,
  targetUsers: z.array(z.object({ persona: str, description: str })).catch([]),
  stakeholders: z.array(z.object({ name: str, role: str, interest: str })).catch([]),
  userStories: strList,
  requirements: z.array(requirementSchema).catch([]),
  scope: z
    .object({ inScope: strList, outOfScope: strList })
    .catch({ inScope: [], outOfScope: [] }),
  assumptions: strList,
  risks: z.array(z.object({ risk: str, mitigation: str })).catch([]),
  openQuestions: strList,
  timeline: str,
  budget: str,
  successMetrics: strList,
})

export type ProductBrief = z.infer<typeof productBriefSchema>

// ---------------------------------------------------------------------------
// Client-supplied reference links (adaptive interview)
// ---------------------------------------------------------------------------

export const clientLinkSchema = z.object({
  url: z
    .url()
    .max(2000)
    .regex(/^https?:\/\//i, "Links must start with http(s)://"),
  label: z.string().trim().max(200).optional(),
})

export const clientLinksSchema = z.array(clientLinkSchema).max(10)

export type ClientLink = z.infer<typeof clientLinkSchema>

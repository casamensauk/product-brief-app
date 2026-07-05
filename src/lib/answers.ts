import { questionsSchema, type Answers, type Question } from "@/lib/schemas"

/** Parse the questions column of a brief, tolerating legacy/empty values. */
export function parseQuestions(raw: unknown): Question[] {
  const result = questionsSchema.safeParse(raw)
  return result.success ? result.data : []
}

/**
 * Keep only answers that belong to a known question and match its type.
 * Select answers must be drawn from the question's options.
 */
export function sanitizeAnswers(questions: Question[], answers: Answers): Answers {
  const byId = new Map(questions.map((q) => [q.id, q]))
  const clean: Answers = {}

  for (const [id, value] of Object.entries(answers)) {
    const question = byId.get(id)
    if (!question) continue

    switch (question.type) {
      case "short_text":
      case "long_text":
        if (typeof value === "string") clean[id] = value
        break
      case "single_select":
        if (typeof value === "string" && (value === "" || question.options?.includes(value))) {
          clean[id] = value
        }
        break
      case "multi_select":
        if (Array.isArray(value)) {
          clean[id] = value.filter((v) => question.options?.includes(v))
        }
        break
    }
  }
  return clean
}

/** Labels of required questions that are missing a usable answer. */
export function missingRequired(questions: Question[], answers: Answers): string[] {
  return questions
    .filter((q) => q.required)
    .filter((q) => {
      const value = answers[q.id]
      if (Array.isArray(value)) return value.length === 0
      return typeof value !== "string" || value.trim() === ""
    })
    .map((q) => q.label)
}

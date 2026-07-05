import type { Answers, ProductBrief, Question } from "@/lib/schemas"

function section(title: string, body: string): string {
  return body.trim() ? `## ${title}\n\n${body.trim()}\n` : ""
}

function bullets(items: string[]): string {
  return items.filter(Boolean).map((i) => `- ${i}`).join("\n")
}

export function productBriefToMarkdown(options: {
  clientName: string
  projectName: string | null
  brief: ProductBrief
  questions: Question[]
  answers: Answers
  generatedAt?: Date
}): string {
  const { clientName, projectName, brief, questions, answers } = options

  const requirementsTable =
    brief.requirements.length > 0
      ? [
          "| Requirement | Category | Priority | Description |",
          "| --- | --- | --- | --- |",
          ...brief.requirements.map(
            (r) =>
              `| ${r.name.replaceAll("|", "\\|")} | ${r.category} | ${r.priority} | ${r.description.replaceAll("|", "\\|").replaceAll("\n", " ")} |`
          ),
        ].join("\n")
      : ""

  const qa = questions
    .map((q) => {
      const value = answers[q.id]
      const text = Array.isArray(value) ? value.join(", ") : value
      return text?.trim() ? `**${q.label}**\n\n${text.trim()}` : null
    })
    .filter(Boolean)
    .join("\n\n")

  return [
    `# Product Brief: ${projectName || clientName}`,
    "",
    `**Client:** ${clientName}${projectName ? `  \n**Project:** ${projectName}` : ""}`,
    "",
    section("Executive summary", brief.executiveSummary),
    section("Problem statement", brief.problemStatement),
    section("Goals", bullets(brief.goals)),
    section(
      "Target users",
      brief.targetUsers.map((u) => `- **${u.persona}** — ${u.description}`).join("\n")
    ),
    section(
      "Stakeholders",
      brief.stakeholders.map((s) => `- **${s.name}** (${s.role}) — ${s.interest}`).join("\n")
    ),
    section("User stories", bullets(brief.userStories)),
    section("Requirements", requirementsTable),
    section(
      "Scope",
      [
        brief.scope.inScope.length ? `**In scope**\n\n${bullets(brief.scope.inScope)}` : "",
        brief.scope.outOfScope.length
          ? `**Out of scope**\n\n${bullets(brief.scope.outOfScope)}`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n")
    ),
    section("Assumptions", bullets(brief.assumptions)),
    section(
      "Risks",
      brief.risks.map((r) => `- **${r.risk}**\n  - Mitigation: ${r.mitigation}`).join("\n")
    ),
    section("Open questions", bullets(brief.openQuestions)),
    section("Timeline", brief.timeline),
    section("Budget", brief.budget),
    section("Success metrics", bullets(brief.successMetrics)),
    section("Appendix: client questionnaire answers", qa),
  ]
    .filter(Boolean)
    .join("\n")
}

export function downloadMarkdown(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

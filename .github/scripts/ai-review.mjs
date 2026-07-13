// AI code review via OpenRouter (DeepSeek). Posts inline PR comments plus one
// upserted summary comment. Self-contained: Node 20+, no dependencies.
// Env: OPENROUTER_API_KEY, GITHUB_TOKEN, REPO (owner/name), PR_NUMBER, HEAD_SHA
// Optional: AI_REVIEW_MODEL (default deepseek/deepseek-chat)

const MARKER = "<!-- ai-review-summary -->";
const MODEL = process.env.AI_REVIEW_MODEL || "deepseek/deepseek-chat";
const MAX_DIFF_CHARS = 90_000;
const MAX_FINDINGS = 15;

const { OPENROUTER_API_KEY, GITHUB_TOKEN, REPO, PR_NUMBER, HEAD_SHA } = process.env;
for (const [k, v] of Object.entries({ GITHUB_TOKEN, REPO, PR_NUMBER, HEAD_SHA })) {
  if (!v) { console.error(`Missing env: ${k}`); process.exit(1); }
}

const gh = async (path, opts = {}) => {
  const res = await fetch(`https://api.github.com${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: opts.accept || "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(opts.body ? { "Content-Type": "application/json" } : {}),
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`GitHub ${opts.method || "GET"} ${path} -> ${res.status}: ${text.slice(0, 500)}`);
    err.status = res.status;
    throw err;
  }
  return opts.accept ? res.text() : res.json();
};

// --- 0. Upsert helper for the summary comment ---
async function upsertSummary(body) {
  const comments = await gh(`/repos/${REPO}/issues/${PR_NUMBER}/comments?per_page=100`);
  const existing = comments.find((c) => c.body?.includes(MARKER));
  if (existing) await gh(`/repos/${REPO}/issues/comments/${existing.id}`, { method: "PATCH", body: JSON.stringify({ body }) });
  else await gh(`/repos/${REPO}/issues/${PR_NUMBER}/comments`, { method: "POST", body: JSON.stringify({ body }) });
}

// No key -> skip gracefully with a visible notice instead of a red X.
if (!OPENROUTER_API_KEY) {
  await upsertSummary(`${MARKER}\n## 🤖 AI Review — ⏭️ Skipped\n\nNo \`OPENROUTER_API_KEY\` secret is configured for this repository, so the DeepSeek review did not run.\n\n<sub>Set it with: \`gh secret set OPENROUTER_API_KEY -R ${REPO}\`</sub>`);
  console.log("OPENROUTER_API_KEY not set; posted skip notice and exited cleanly.");
  process.exit(0);
}

// --- 1. Fetch PR metadata and diff ---
const pr = await gh(`/repos/${REPO}/pulls/${PR_NUMBER}`);
let diff = await gh(`/repos/${REPO}/pulls/${PR_NUMBER}`, { accept: "application/vnd.github.diff" });
let truncated = false;
if (diff.length > MAX_DIFF_CHARS) { diff = diff.slice(0, MAX_DIFF_CHARS); truncated = true; }
if (!diff.trim()) { console.log("Empty diff, nothing to review."); process.exit(0); }

// --- 2. Build map of commentable lines (added lines, new-file numbering) ---
const commentable = new Map(); // path -> Set(line)
{
  let path = null, newLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ b/")) { path = raw.slice(6); commentable.set(path, commentable.get(path) || new Set()); continue; }
    if (raw.startsWith("+++ /dev/null")) { path = null; continue; }
    const hunk = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) { newLine = parseInt(hunk[1], 10); continue; }
    if (!path) continue;
    if (raw.startsWith("+")) { commentable.get(path).add(newLine); newLine++; }
    else if (raw.startsWith("-") || raw.startsWith("\\")) { /* old side, no advance */ }
    else { newLine++; }
  }
}

// --- 3. Ask the model for a review ---
const systemPrompt = `You are a rigorous senior code reviewer. Review the pull request diff and report only findings that matter:
- Correctness bugs (logic errors, unhandled edge cases, race conditions, broken error handling)
- Security (SQL/command/prompt injection, missing authz/IDOR, secrets in code, SSRF, XSS, unsafe deserialization)
- Data safety (destructive migrations, missing transactions, data loss on failure paths)
- Significant performance problems (N+1 queries, unbounded loops/memory)
Do NOT report style preferences, formatting, or speculative refactors. Prefer few high-signal findings over many weak ones.
Severity scale: critical (must not merge), high (should fix before merge), medium (should fix soon), low (worth noting), nit (trivial).
Respond with ONLY a JSON object, no markdown fence, in this exact shape:
{"summary":"2-4 sentence overall assessment","verdict":"approve|comment|request_changes","findings":[{"path":"relative/file/path","line":123,"severity":"high","title":"short title","body":"explanation and concrete suggested fix"}]}
"line" must be a line number from the NEW version of the file that appears as an added (+) line in the diff. If a finding has no precise line, omit "line".`;

const userPrompt = `Repository: ${REPO}
PR #${PR_NUMBER}: ${pr.title}
${pr.body ? `Description:\n${pr.body.slice(0, 2000)}\n` : ""}${truncated ? "NOTE: diff truncated to first 90k chars.\n" : ""}
Diff:
${diff}`;

const orRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: MODEL,
    temperature: 0.2,
    max_tokens: 4000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  }),
});
if (!orRes.ok) { console.error(`OpenRouter ${orRes.status}: ${(await orRes.text()).slice(0, 500)}`); process.exit(1); }
const orJson = await orRes.json();
const content = orJson.choices?.[0]?.message?.content || "";

let review;
try {
  const match = content.match(/\{[\s\S]*\}/);
  review = JSON.parse(match ? match[0] : content);
} catch {
  console.error(`Could not parse model output as JSON:\n${content.slice(0, 1000)}`);
  process.exit(1);
}
const findings = (Array.isArray(review.findings) ? review.findings : [])
  .filter((f) => f && f.title && f.body)
  .slice(0, MAX_FINDINGS);

// --- 4. Split findings into inline-able vs summary-only ---
const sevEmoji = { critical: "🔴", high: "🟠", medium: "🟡", low: "🔵", nit: "⚪" };
const fmt = (f) => `${sevEmoji[f.severity] || "🟡"} **[${(f.severity || "medium").toUpperCase()}] ${f.title}**\n\n${f.body}\n\n<sub>🤖 ai-review (${MODEL})</sub>`;
const inline = [], summaryOnly = [];
for (const f of findings) {
  if (f.path && Number.isInteger(f.line) && commentable.get(f.path)?.has(f.line)) inline.push(f);
  else summaryOnly.push(f);
}

// --- 5. Post inline comments as a single review (fallback: push all to summary) ---
if (inline.length) {
  try {
    await gh(`/repos/${REPO}/pulls/${PR_NUMBER}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        commit_id: HEAD_SHA,
        event: "COMMENT",
        body: `${sevEmoji[findings[0]?.severity] || "🤖"} ai-review found ${findings.length} issue(s) — see inline comments and summary below.`,
        comments: inline.map((f) => ({ path: f.path, line: f.line, side: "RIGHT", body: fmt(f) })),
      }),
    });
  } catch (e) {
    console.error(`Inline review failed (${e.status}); falling back to summary-only. ${e.message}`);
    summaryOnly.push(...inline);
    inline.length = 0;
  }
}

// --- 6. Upsert the summary comment ---
const verdictLabel = { approve: "✅ Looks good", comment: "💬 Comments", request_changes: "❌ Changes requested" }[review.verdict] || "💬 Comments";
const rows = findings.map((f) => `| ${sevEmoji[f.severity] || "🟡"} ${f.severity || "medium"} | ${f.path ? `\`${f.path}${f.line ? `:${f.line}` : ""}\`` : "—"} | ${f.title} |`).join("\n");
const extra = summaryOnly.length
  ? `\n<details><summary>Findings without an inline anchor (${summaryOnly.length})</summary>\n\n${summaryOnly.map((f) => `- ${fmt(f).replace(/\n+/g, " ")}`).join("\n")}\n</details>\n`
  : "";
const summaryBody = `${MARKER}
## 🤖 AI Review — ${verdictLabel}

${review.summary || ""}

${findings.length ? `| Severity | Location | Finding |\n|---|---|---|\n${rows}` : "No significant issues found."}
${extra}${truncated ? "\n> ⚠️ Diff was truncated to 90k chars; review may be incomplete.\n" : ""}
<sub>Model: \`${MODEL}\` · commit \`${HEAD_SHA.slice(0, 7)}\` · re-runs update this comment in place</sub>`;

await upsertSummary(summaryBody);

console.log(`Review posted: ${findings.length} finding(s) (${inline.length} inline), verdict: ${review.verdict}`);

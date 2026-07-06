# Discovery Pro — Improvement Plan (Agent Handoff Spec)

This document is a self-contained work spec for AI coding agents (Claude Opus /
Sonnet sessions). It assumes **no prior conversation context**. Read this whole
file, then the "Ground rules" section again, before writing any code.

Each work package (WP) has an objective, a detailed spec, acceptance criteria,
and a suggested model tier. Respect the dependency graph in "Sequencing".

---

## 1. What this app is

**Discovery Pro** (repo `product-brief-app`) is a client-discovery tool for a
software agency:

1. An authenticated user creates a **discovery session** for a client/project.
   It starts with a default questionnaire which can be edited per-question or
   drafted by AI (`/api/briefs/[token]/suggest-questions`).
2. The client receives **one share link** (`/q/<shareToken>`, no account
   needed): step-per-question form, debounced autosave, required-question
   validation, review screen, submit. After submit the questionnaire **locks
   server-side** (writes return 409).
3. The user generates an **AI product brief** from the answers
   (`/api/briefs/[token]/generate`): executive summary, goals, personas,
   stakeholders, user stories, MoSCoW requirements, scope in/out, assumptions,
   risks, open questions, timeline, budget, success metrics. Exportable as
   Markdown.
4. Status workflow: `DRAFT` (awaiting answers) → `SUBMITTED` (answers
   received, auto-set on client submit) → `REVIEWED` (auto-set on first
   generation) → `SCOPED` (manual).

The app was fully rebuilt to production quality in July 2026 (PR #1). The core
loop works and is browser-verified. This plan adds everything *around* the
loop.

## 2. Current architecture (as-built facts)

- **Stack**: Next.js 16.2.10 (App Router, Turbopack), React 19, Prisma 7 +
  PostgreSQL (Neon), better-auth 1.6 (self-hosted, email/password), Tailwind 4,
  shadcn-style components generated on **Base UI** (`@base-ui/react` — NOT
  Radix), lucide-react icons, sonner toasts, zod 4, OpenRouter for AI.
- **Auth**: `src/lib/auth.ts` (betterAuth + prismaAdapter + nextCookies),
  handler at `src/app/api/auth/[...all]/route.ts`, same-origin client in
  `src/lib/auth-client.ts`, session helpers in `src/lib/session.ts`
  (`getSession()` for pages, `requireSession(req)` for API routes).
  `src/proxy.ts` (Next 16 renamed middleware → **proxy**) does optimistic
  cookie redirects for `/dashboard` and `/login`; real validation is always
  server-side.
- **Data model** (`prisma/schema.prisma`): `ProjectBrief` (clientName,
  projectName, contactEmail, shareToken unique, status enum, `questions Json`,
  `rawClientAnswers Json`, `generatedBrief Json`, submittedAt, timestamps, plus
  5 **legacy Json columns** — stakeholders, gatheringMethods,
  categorisedRequirements, analysisModels, documentationData — unused, kept
  only so `db push` wouldn't drop data). better-auth tables: `user`, `session`,
  `account`, `verification` (mapped lowercase).
- **Key libs**: `src/lib/schemas.ts` (zod: Question, Answers, ProductBrief —
  AI-output schema uses `.catch()` fallbacks so partial AI responses still
  parse), `src/lib/answers.ts` (parseQuestions with default-template fallback,
  sanitizeAnswers, missingRequired), `src/lib/ai.ts` (OpenRouter completeJson,
  AIError with user-presentable messages, 503 when no key),
  `src/lib/api.ts` (jsonError/unauthorized/notFound/parseBody),
  `src/lib/templates.ts` (DEFAULT_QUESTIONS — ids intentionally match the
  legacy hardcoded form's answer keys), `src/lib/markdown.ts`,
  `src/lib/share.ts` (useShareUrl via useSyncExternalStore),
  `src/lib/status.ts` (labels/badge variants).
- **API surface today** (all under `/api`): `briefs` GET/POST (auth);
  `briefs/[token]` GET/PATCH/DELETE (auth, zod field whitelist);
  `briefs/[token]/answers` PUT (public, token = capability, sanitized,
  409 after submit); `briefs/[token]/submit` POST (public, validates required,
  sets SUBMITTED + submittedAt); `briefs/[token]/suggest-questions` POST
  (auth, AI); `briefs/[token]/generate` POST (auth, AI, auto-advances
  SUBMITTED→REVIEWED).
- **Pages**: `/` landing (server, session-aware CTA), `/login` (client comp),
  `/dashboard` (server fetch → `BriefsList`), `/dashboard/brief/[token]`
  (server fetch → `BriefWorkspace` with tabs Questionnaire / Responses /
  Product brief), `/q/[token]` (server fetch → `ClientQuestionnaire`),
  `/project/reqs/[token]` (redirect to `/q/[token]` for legacy links).
- **Database**: Neon project `orange-bar-84846863`, db `neondb`. Schema is
  currently managed with `prisma db push` (no migration history yet).
  `prisma.config.ts` prefers `DATABASE_URL_UNPOOLED` for CLI ops. A dormant
  `neon_auth` schema exists from an abandoned hosted-auth setup — **never
  touch it, never re-adopt it** (its cross-domain cookies break Safari and
  can't be validated server-side).
- **Existing data worth knowing**: one real user (simmakin@gmail.com, migrated,
  password works), one demo brief ("Member Booking App" / Acme Fitness) with a
  full submitted questionnaire — useful for manual testing generation. Three
  junk briefs (projectName `sdfsdf`, `sadsad`, `shitebox`) authorized for
  deletion in WP1.
- **Env** (`.env`, gitignored; `.env.example` committed): `DATABASE_URL`,
  `DATABASE_URL_UNPOOLED`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
  `OPENROUTER_API_KEY` (**currently empty — AI endpoints return a clear 503;
  never assume a key exists**), `OPENROUTER_MODEL` (default
  `anthropic/claude-sonnet-4.5`).
- **Dev/verify**: `npm run dev` (port 3000, `.claude/launch.json` exists for
  preview tooling), `npm run lint`, `npm run build`. No tests, no CI yet
  (WP12 adds both).

## 3. Ground rules for every agent

1. **Read `AGENTS.md`** — this Next.js version has breaking changes; docs live
   in `node_modules/next/dist/docs/`. Notables already encountered:
   middleware is `proxy.ts` (export `proxy` fn); route/page `params` are
   `Promise`s (`await params`).
2. **Base UI, not Radix.** Gotchas already hit — do not regress them:
   - `Select` needs an `items` prop (`Record<value, label>`) or the trigger
     renders the raw value instead of a label.
   - `DropdownMenuLabel` must be wrapped in `DropdownMenuGroup` or it throws
     `MenuGroupContext is missing` at open time.
   - Dialog/Dropdown triggers take a `render={<Button/>}` prop.
3. **React 19 + strict hooks lint**: no `window` access during render of
   client components (they SSR — use the `useSyncExternalStore` pattern in
   `src/lib/share.ts` as reference); no setState directly in effect bodies; no
   ref writes during render. `npm run lint` enforces these as errors.
4. **After any `prisma/schema.prisma` change**, run `npx prisma generate`
   before building (stale client types otherwise fail the build).
5. **Destructive operations** (dropping columns, deleting rows, `--force`/
   `--accept-data-loss` flags) are permission-gated. Do additive changes
   freely; for the explicitly authorized destructive items (WP1 only), state
   in your commit/PR what was authorized. If a permission denial occurs,
   don't fight it — do the additive subset and flag the rest for the user.
6. **Definition of Done (user's global rule)**: work is finished only when
   code is committed on a feature branch, a PR is created, CI passes, bot
   review comments (Gemini `@gemini-code-assist[bot]`, Copilot) are addressed
   — fix legitimate high/medium findings, reply with reasoning to incorrect
   ones — and the PR is merged. Ask the user before merging if unsure.
7. **Verify in the browser** with the preview tooling (a `dev` config exists
   in `.claude/launch.json`) — every UI-facing WP lists manual verification
   steps; run them. `npm run lint && npm run build` must be clean before
   every commit.
8. **Style**: match existing code — double quotes, no semicolons in app code,
   `@/` imports, small focused components, toasts via `sonner`, errors as
   `{ error: string }` JSON with correct status codes, user-facing copy in
   plain friendly English.
9. **Never commit `.env`**; keep `.env.example` updated with every new
   variable you introduce (with a comment).

## 4. Sequencing

```
WP1 (schema+migrations)  ──►  WP2 (route refactor)  ──►  everything else
WP3 (email) ──► WP9 (clarification loop) and parts of WP10
WP7 (brief workroom) ──► WP8 (streaming), WP9
WP12 (tests+CI) LAST — it locks in behavior of everything above
Parallel-safe once WP1+WP2 land: WP3, WP4, WP5, WP6, WP10, WP11
```

Recommended batching (one PR per batch, in order):
- **Batch A (Opus)**: WP1 + WP2
- **Batch B (Opus)**: WP3 + WP4
- **Batch C (Sonnet)**: WP5 + WP6
- **Batch D (Opus)**: WP7 + WP8
- **Batch E (Sonnet)**: WP9 + WP10 + WP11
- **Batch F (Opus)**: WP12

---

## WP1 — Schema v2 + real migrations *(Opus)*

**Objective**: extend the data model for everything below, move from
`db push` to committed Prisma migrations, and perform the authorized cleanup.

**Schema additions** (all names final — use exactly these):

```prisma
model ProjectBrief {
  // existing fields stay; ADD:
  ownerId          String?
  owner            User?   @relation(fields: [ownerId], references: [id], onDelete: SetNull)
  briefShareToken  String? @unique   // read-only brief share page (WP10)
  attachments      Attachment[]
  versions         BriefVersion[]
  // REMOVE the 5 legacy columns: stakeholders, gatheringMethods,
  // categorisedRequirements, analysisModels, documentationData
}

model QuestionnaireTemplate {
  id          String   @id @default(uuid())
  name        String
  questions   Json
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model BriefVersion {
  id        String       @id @default(uuid())
  briefId   String
  brief     ProjectBrief @relation(fields: [briefId], references: [id], onDelete: Cascade)
  content   Json         // a full ProductBrief snapshot
  label     String       // e.g. "Before regeneration", "Restored"
  createdAt DateTime     @default(now())
  @@index([briefId])
}

model Attachment {
  id         String       @id @default(uuid())
  briefId    String
  brief      ProjectBrief @relation(fields: [briefId], references: [id], onDelete: Cascade)
  filename   String
  mimeType   String
  size       Int
  data       Bytes        // stored in Postgres deliberately — zero external deps
  createdAt  DateTime     @default(now())
  @@index([briefId])
}

model WorkspaceSettings {
  id         String   @id @default("default")   // singleton row
  agencyName String   @default("Discovery Pro")
  logoUrl    String?
  updatedAt  DateTime @updatedAt
}
```

Add the inverse relation `briefs ProjectBrief[]` on `User`.

**Migration strategy** (live Neon DB has no migration history; no shadow DB).
Note: **Prisma 7 removed `--to-url`/`--from-url`** — use
`--from-config-datasource` / `--to-config-datasource` (resolves the datasource
from `prisma.config.ts`) and `--to-schema=<path>` instead. This baseline was
already created in WP1; later WPs only author step-2-style migrations:

1. Baseline (done in WP1): `npx prisma migrate diff --from-empty --to-config-datasource --script`
   → saved as `prisma/migrations/20260706000000_baseline/migration.sql`, then
   `npx prisma migrate resolve --applied 20260706000000_baseline`.
2. Edit `schema.prisma`, then
   `npx prisma migrate diff --from-config-datasource --to-schema=prisma/schema.prisma --script`
   → save as `prisma/migrations/<ts>_<name>/migration.sql`, review the SQL,
   apply with `npx prisma migrate deploy`, then `npx prisma generate`.
3. README already documents this workflow (no shadow database on Neon).

**Authorized destructive cleanup** (explicitly approved by the user):
dropping the 5 legacy columns (only the 3 junk briefs ever had data in them),
and deleting the junk briefs:
`DELETE FROM "ProjectBrief" WHERE "projectName" IN ('sdfsdf','sadsad','shitebox');`
Keep the Acme Fitness demo brief.

**Also**: set `ownerId` on brief creation (`session.user.id` in
`POST /api/briefs`); include owner name in the dashboard list (subtle
"Created by" text or title attr — keep light, single shared workspace remains).

**Accept**: migrations committed and applied to Neon; `migrate deploy` is a
no-op on second run; build+lint green; legacy code references to removed
columns gone (grep for `gatheringMethods` etc. — there should be none, but
verify); junk briefs gone; new brief gets ownerId.

## WP2 — Route refactor: ids for management, tokens for public *(Opus, with WP1)*

**Objective**: management surfaces keyed by immutable `brief.id`; the share
token becomes a rotatable client-only capability.

- Move dashboard page to `/dashboard/brief/[id]` (lookup by id). Update all
  internal links (`briefs-list`, `create-brief-dialog` redirect).
- Management APIs → `/api/briefs/[id]`, `/api/briefs/[id]/generate`,
  `/api/briefs/[id]/suggest-questions` (same behavior, lookup by id).
- Public APIs → `/api/public/briefs/[token]/answers` (PUT) and
  `/api/public/briefs/[token]/submit` (POST). `/q/[token]` unchanged.
- New: `POST /api/briefs/[id]/rotate-link` (auth) → generates a fresh
  `shareToken` (`randomBytes(24).toString("base64url")`), returns updated
  brief. UI: "Rotate link" button beside Copy link, confirm dialog warning
  that the old client link stops working immediately.
- Keep `/project/reqs/[token]` redirect working.

**Accept**: full old E2E flow re-verified in browser (create → edit
questionnaire → client answer → submit → responses); rotation kills the old
`/q` URL (404) and the new one works; anonymous requests to management APIs
still 401; lint/build green.

## WP3 — Email layer: Resend, password reset, signup gating, notifications *(Opus)*

**Objective**: the app can talk to people, and the front door is controllable.

- `src/lib/email.ts`: `sendEmail({to, subject, html, text?})` using the
  **Resend REST API via plain fetch** (no SDK). Env: `RESEND_API_KEY`,
  `EMAIL_FROM` (e.g. `Discovery Pro <onboarding@resend.dev>`). When the key is
  missing, return `{ sent: false, reason: "not_configured" }` and log — never
  throw. All calling UI must surface this state honestly (e.g. toast "Email
  isn't configured — copy the link instead").
- Simple branded HTML templates (inline, no template lib): questionnaire
  invite, submission notification, password reset, follow-up questions
  (WP9 reuses).
- **Password reset**: better-auth `emailAndPassword.sendResetPassword`
  callback → email with reset URL. Login page gets "Forgot password?" →
  request form (`authClient.requestPasswordReset({ email, redirectTo:
  "/reset-password" })`, always show success message regardless of account
  existence). New `/reset-password` page reads the token query param →
  `authClient.resetPassword({ newPassword, token })` → redirect to login.
- **Signup gating**: `ALLOW_SIGNUP` env (default allow; `"false"` disables).
  Wire `emailAndPassword.disableSignUp` in `src/lib/auth.ts`. `/login` becomes
  a server page that reads the env and passes `allowSignUp` to the client
  form; hide the sign-up toggle when disabled.
- **Submission notification**: in the public submit route, after saving, email
  the brief owner (`ownerId` → user email; if no owner, skip). Include client
  name, project, and a link to `/dashboard/brief/[id]`. Fire-and-forget with
  caught errors — must never fail the client's submit.
- **Send link to client**: `POST /api/briefs/[id]/send-link` (auth) — emails
  the questionnaire link to `contactEmail`. Workspace share box gets an
  "Email to client" button (disabled with tooltip when no contactEmail or
  email unconfigured; toast the result).

**Accept**: without `RESEND_API_KEY` every flow degrades gracefully (verified
in browser); with a key (if the user has provided one by then) a real email
sends; reset flow round-trips locally when email configured; signup toggle
disappears with `ALLOW_SIGNUP=false` and the API rejects sign-up attempts too
(verify with curl — UI hiding is not enforcement). `.env.example` updated.

## WP4 — Hardening: rate limits + error instrumentation *(Sonnet)*

- Enable better-auth's built-in rate limiting in `src/lib/auth.ts`
  (`rateLimit: { enabled: true, window: 60, max: 20 }` — tune sign-in
  specifically if the API supports per-path rules in the installed version;
  check `node_modules/better-auth` types).
- `src/lib/rate-limit.ts`: in-memory sliding-window limiter
  `checkRateLimit(key, { windowMs, max })` (documented as per-instance;
  fine for single-instance Railway). Apply to public endpoints:
  answers PUT 30/min per `ip+token`, submit POST 5/min, attachment upload
  (WP6) 10/min. Key from `x-forwarded-for` first hop, fallback "unknown".
  Return 429 `{ error: "Too many requests — please slow down." }`.
- `src/instrumentation.ts`: export `onRequestError` (Next 16 hook) logging a
  single structured JSON line (message, digest, path, method). Note in README
  that Sentry can hook here later.

**Accept**: hammering submit with curl in a loop returns 429 after the limit;
unit-testable limiter logic; lint/build green.

## WP5 — Questionnaire templates *(Sonnet)*

- API `/api/templates`: GET (list id+name+question count+updatedAt), POST
  `{name, questions}` (validate with `questionsSchema`, max 50 templates),
  DELETE `/api/templates/[id]`. All auth-gated.
- Builder toolbar: "Save as template" button → name dialog → POST → toast.
- Create-session dialog: template `Select` (items: "Default questionnaire" +
  saved templates, fetched on open). Creating with a template copies its
  questions (fresh `crypto.randomUUID()` ids per question).
- Settings page (created properly in WP10; if WP10 hasn't landed yet, create a
  minimal `/dashboard/settings` page now with just the template list +
  delete-with-confirm; WP10 extends it).

**Accept**: save → appears in picker → create session with it → questions
match (with new ids); delete works; template misuse (empty name, invalid
questions) rejected with 400.

## WP6 — Client file attachments *(Sonnet)*

- Public upload: `POST /api/public/briefs/[token]/attachments` (multipart
  `FormData`, field `file`). Rules: brief must be `DRAFT`; max **5 MB**/file;
  max **5** attachments per brief; mime whitelist `image/png, image/jpeg,
  image/webp, image/gif, application/pdf` (check both reported mime and
  filename extension); store via Prisma `Bytes`
  (`Buffer.from(await file.arrayBuffer())`). Return metadata (id, filename,
  size). Rate-limited (WP4 helper).
- Public delete: `DELETE /api/public/briefs/[token]/attachments/[id]`
  (DRAFT only, attachment must belong to that brief).
- Public list: include attachment metadata (never bytes) in the `/q/[token]`
  page load.
- Auth download: `GET /api/attachments/[id]` streams bytes with correct
  `Content-Type` and `Content-Disposition: attachment; filename="..."`.
- Client UI: on the **review step** of `ClientQuestionnaire`, an "Add
  supporting files (optional)" card — file input, list with size + remove
  button, upload progress state, clear errors for size/type/count limits.
- Dashboard UI: Responses tab lists attachments with download links.

**Accept**: browser-verified upload/delete/download round-trip incl. limits
(oversize file → friendly error); locked after submit (409); download requires
auth (curl without cookie → 401).

## WP7 — Brief workroom: editable sections, section regenerate, versions *(Opus — largest WP)*

**Objective**: the generated brief becomes an editable working document.

- **Manual editing**: each section card in `ProductBriefView` gets an Edit
  toggle switching to inputs: plain `Textarea` for string sections
  (executiveSummary, problemStatement, timeline, budget); one-item-per-line
  `Textarea` for string-array sections (goals, userStories, assumptions,
  openQuestions, successMetrics, scope.inScope, scope.outOfScope); structured
  item editors (small field groups per item, add/remove) for targetUsers,
  stakeholders, risks, requirements (name, description, category select,
  priority select). Save/Cancel per section.
- `PATCH /api/briefs/[id]/brief` `{ generatedBrief }` validated with
  `productBriefSchema` (auth). Manual saves do NOT create versions.
- **Section regenerate**: `POST /api/briefs/[id]/generate-section`
  `{ section: <key> }` — AI call scoped to one section (same Q&A context
  prompt as full generation, instructing JSON `{ "<section>": ... }`),
  validated against that slice of the schema, merged into `generatedBrief`.
  Snapshot a version first. UI: small regenerate icon-button per section with
  spinner.
- **Versions**: before any full or section regeneration (and before restore),
  snapshot the current `generatedBrief` (when non-null) to `BriefVersion`
  with labels "Before regeneration" / "Before restoring". Cap: keep the 20
  most recent per brief (prune oldest on insert). API:
  `GET /api/briefs/[id]/versions` (id, label, createdAt),
  `POST /api/briefs/[id]/versions/[versionId]/restore`.
  UI: "History" dropdown in the Product brief tab → list with relative
  timestamps → view is optional, restore with confirm is required.

**Accept**: edit each section type and persist across reload; regenerate one
section (with no OpenRouter key: clean 503 toast, no state corruption);
version list grows on regenerate, restore round-trips, cap enforced (unit
test or manual check); markdown export reflects edits.

## WP8 — Streaming brief generation *(Opus, after WP7)*

**Objective**: replace the 30–60s spinner with live progress.

- Rework `POST /api/briefs/[id]/generate` to call OpenRouter with
  `stream: true`, read its SSE, and return a streamed response
  (`text/event-stream`, `ReadableStream`) of our own events:
  `event: progress` `data: {"section":"goals"}` — emitted when a new
  top-level key (`"goals":`) first appears in the accumulated JSON text;
  `event: done` `data: <updated brief JSON>` after server-side validation +
  save (+ version snapshot per WP7); `event: error` `data: {"error":"..."}`
  on any failure (including the no-API-key 503 case — emit the same
  user-presentable message `AIError` produces today).
- Client (`ProductBriefView`): `fetch` + `res.body.getReader()`, parse SSE
  frames, render a checklist ("Executive summary ✓, Goals ✓, …" — use the
  section order/labels already in the view) while generating; on `done`
  update state as today; on `error` toast.
- Keep `suggest-questions` non-streaming.
- Note: response must set `Cache-Control: no-store`; test behind Turbopack
  dev and `next build && next start`.

**Accept**: without a key the stream immediately yields the error event and
the UI toasts it; with the demo brief and a key (if available), progress items
tick in before completion. If no key is available for live testing, unit-test
the SSE frame parser and the section-detection logic server-side (feed a
canned OpenRouter stream fixture) — that is the acceptance bar.

## WP9 — Clarification round-trip *(Sonnet, after WP3 + WP7)*

**Objective**: close the loop on the AI's "open questions for the client".

- `POST /api/briefs/[id]/follow-up` `{ questions: string[] }` (auth,
  1–10 items, each ≤500 chars): appends them to the brief's `questions` as
  `long_text`, `required: false`, fresh UUIDs, `helpText: "Follow-up question
  after our first review"`; sets status back to `DRAFT` (unlocks
  answering/attachments); if `contactEmail` + email configured, sends the
  follow-up email with the questionnaire link; response includes
  `{ emailed: boolean }`.
- UI: in the Product brief tab, when `generatedBrief.openQuestions.length > 0`,
  a "Send follow-up questions" button → dialog listing open questions with
  checkboxes (all checked by default, editable text) → submit → toast
  ("Questionnaire unlocked and emailed" / "…unlocked — email not configured,
  copy the link"). Switch workspace status badge accordingly.
- Client side: intro screen "Continue" must jump to the **first unanswered
  question** (compute from answers) instead of question 1, so returning
  clients land on the new questions. The thank-you/locked state must
  automatically clear because status is DRAFT again — verify.
- Responses view: follow-up questions appear like any other question (the
  helpText distinguishes them). Submission re-locks as normal and re-notifies
  (WP3).

**Accept**: full browser round-trip on the demo brief: generate is not needed —
manually add openQuestions via the WP7 editor if no AI key; follow-up →
client link unlocked, lands on new question → answer → resubmit → responses
show both rounds.

## WP10 — Shareable read-only brief + white-labeling + settings page *(Sonnet)*

- **Share page** `/brief/[briefShareToken]` (public, `robots: noindex`):
  clean read-only render of the product brief (reuse the section components
  read-only — extract them if needed), agency branding header, client/project
  names, generated date. 404 when token null/unknown.
- Workspace Product brief tab: "Share brief" button → if no
  `briefShareToken`, create one (same token generator); dialog with copy
  link + "Rotate" (invalidate old) + "Disable sharing" (null it out).
  Endpoint: `POST /api/briefs/[id]/share-brief` `{ action: "enable" |
  "rotate" | "disable" }`.
- **PDF**: `@media print` stylesheet for the share page (hide chrome, page
  margins, avoid card break-inside) + a "Download PDF" button calling
  `window.print()`. No server-side PDF dependency.
- **White-labeling**: `/dashboard/settings` page (extends WP5's stub):
  agencyName + logoUrl fields → `GET/PATCH /api/settings` (auth; singleton
  upsert on id "default"; validate logoUrl is https URL or empty). The client
  questionnaire header (`/q`) and the share page use agencyName + logo
  (fallback to current "Discovery Pro" text + FileText icon). Server-fetch
  settings in those pages.
- Navigation: settings gear link in the dashboard header.

**Accept**: browser-verified share/rotate/disable lifecycle; print preview
looks clean (verify via preview screenshot of print emulation if possible,
else visual check of the page + sensible print CSS); renamed agency shows on
`/q` and share page.

## WP11 — Dark mode + polish *(Sonnet)*

- `next-themes`: ThemeProvider (attribute="class") in root layout,
  `suppressHydrationWarning` on `<html>`, remove the hardcoded `light` class.
  Theme toggle (Light/Dark/System) in the user menu dropdown — remember the
  Base UI `DropdownMenuGroup` gotcha.
- The `.dark` token set already exists in `globals.css`; sweep every page in
  dark mode via preview (`preview_resize` colorScheme dark) and fix contrast
  issues (likely: badge variants, borders on cards, the share box `font-mono`
  block, toast richColors is fine).
- Polish sweep: favicon still default Next asset — generate a simple "D"
  document-icon SVG favicon; page `<title>`s per route via metadata; 404 page
  already exists.

**Accept**: no white flashes on navigation in dark mode; every page readable
in both themes (screenshot evidence in PR); system preference respected.

## WP12 — Tests + CI *(Opus — LAST)*

**Objective**: lock in the security-critical behavior and give the repo real
CI (the user's Definition of Done references CI that doesn't exist yet).

- **Vitest** (add `vitest`, config with `@/` alias, two projects):
  - `unit` (no DB): `answers` (sanitizeAnswers type/option enforcement,
    missingRequired, parseQuestions legacy fallback), `schemas`
    (productBriefSchema catch-fallbacks on partial AI output; questionSchema
    select-needs-options rule), `markdown` (pipe escaping, empty sections
    dropped), `rate-limit` (window expiry, per-key isolation), WP8's SSE
    parsing/section detection.
  - `integration` (requires `TEST_DATABASE_URL`; skip cleanly when absent):
    import route handlers directly and invoke with `Request` objects against
    a real Postgres (env-switched `DATABASE_URL` in test setup before any
    imports; `prisma migrate deploy` first). Cover: 401s on every management
    route without a session; full session flow via
    `auth.api.signUpEmail` → cookie → authorized calls; public answers →
    submit → 409 lock; answer sanitization end-to-end; attachment limits;
    signup rejection when `ALLOW_SIGNUP=false`.
- **GitHub Actions** `.github/workflows/ci.yml` on PR + push to main:
  - job `build`: checkout, setup-node 22 + npm cache, `npm ci`,
    `npx prisma generate` (postinstall does it, but be explicit),
    `npm run lint`, `npm run build` with dummy env
    (`DATABASE_URL=postgresql://x:x@localhost:5432/x`,
    `BETTER_AUTH_SECRET=ci-dummy`, `BETTER_AUTH_URL=http://localhost:3000`).
  - job `test`: `postgres:16` service container; `TEST_DATABASE_URL` +
    `DATABASE_URL` pointing at it; `npx prisma migrate deploy`;
    `npx vitest run`.
- Playwright browser tests are explicitly **out of scope** (manual preview
  verification stands in); note this in the PR.

**Accept**: CI green on the PR itself (this is the first PR where "CI passes"
in the Definition of Done is real); integration suite catches a deliberately
broken auth guard (try it locally, then revert).

---

## Final state checklist (after all WPs)

- [ ] Client can receive the link by email, upload files, answer follow-ups.
- [ ] User gets notified on submission; can reset a forgotten password.
- [ ] Sign-up can be switched off; auth + public endpoints are rate-limited.
- [ ] Brief is editable, regenerable per-section, versioned, streamable,
      shareable read-only, printable to PDF.
- [ ] Questionnaires can be saved as reusable templates.
- [ ] Workspace is white-labeled and dark-mode capable.
- [ ] Vitest suites + GitHub Actions CI protect all of it.
- [ ] README and `.env.example` document every new env var:
      `RESEND_API_KEY`, `EMAIL_FROM`, `ALLOW_SIGNUP`, `TEST_DATABASE_URL`.
- [ ] `OPENROUTER_API_KEY` still needs to be provided by the user for live AI.

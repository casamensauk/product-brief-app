# Discovery Pro

Turn client discovery questionnaires into structured product briefs.

**The workflow:**

1. **Create a discovery session** for a client/project. It starts with a proven
   default questionnaire you can edit — or let AI draft one tailored to the
   project.
2. **Share one link** with the client. They answer step by step on any device,
   answers autosave, and required questions are enforced. No client account
   needed.
3. **Generate the product brief.** AI turns the answers into a structured
   brief — executive summary, goals, personas, stakeholders, user stories,
   MoSCoW-prioritised requirements, scope, assumptions, risks, open questions,
   timeline, budget and success metrics — exportable as Markdown.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19
- [Prisma 7](https://www.prisma.io) on PostgreSQL (built for [Neon](https://neon.tech))
- [better-auth](https://better-auth.com) email/password sessions (self-hosted)
- [OpenRouter](https://openrouter.ai) for AI generation (model configurable)
- Tailwind CSS 4 + shadcn-style components on Base UI

## Getting started

```bash
npm install
cp .env.example .env       # then fill in the values below
npx prisma migrate deploy  # applies committed migrations
npm run dev
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string (pooled is fine) |
| `DATABASE_URL_UNPOOLED` | no | Direct connection for the Prisma CLI (recommended with Neon/PgBouncer) |
| `BETTER_AUTH_SECRET` | yes | Session signing secret — `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | yes | Canonical app URL (`http://localhost:3000` in dev) |
| `OPENROUTER_API_KEY` | for AI | Key from [openrouter.ai/keys](https://openrouter.ai/keys). Without it the app works, but AI features return a clear error |
| `OPENROUTER_MODEL` | no | Defaults to `anthropic/claude-sonnet-4.5` |

Sign up from `/login` — the first account is created through the normal
sign-up form.

## Security model

- `/dashboard/*` and all management APIs require a session (validated
  server-side; `src/proxy.ts` adds an optimistic cookie redirect).
- The client questionnaire is capability-based: the unguessable share token
  in the URL grants access to answering **only**. Public endpoints accept
  answers solely for questions that exist, lock after submission, and can
  touch nothing else on a brief.
- AI endpoints are session-gated, so an anonymous visitor can never spend
  your OpenRouter credits.

## Database migrations

Schema changes are tracked as committed Prisma migrations in
`prisma/migrations`. To apply them (locally or in CI/production):

```bash
npx prisma migrate deploy
```

To author a new migration after editing `prisma/schema.prisma`, generate the
SQL by diffing the live database against the schema, then apply it. Neon has no
shadow database, so `migrate dev` is not used — diff manually instead:

```bash
# writes the ALTER/CREATE statements for your schema edits
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema=prisma/schema.prisma \
  --script > prisma/migrations/<timestamp>_<name>/migration.sql

npx prisma migrate deploy
```

The Prisma CLI reads `DATABASE_URL_UNPOOLED` (falling back to `DATABASE_URL`)
via `prisma.config.ts`.

## Deployment

Any Node host works (Railway, Vercel, Fly…). Set the env vars above with
`BETTER_AUTH_URL` pointing at your public URL, and run `npx prisma migrate
deploy` against the production database as part of each release.

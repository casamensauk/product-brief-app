import Link from "next/link"
import { ArrowRight, FileText, ListChecks, Send, Sparkles } from "lucide-react"
import { getSession } from "@/lib/session"

export default async function Home() {
  const session = await getSession()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 font-heading text-lg font-bold">
          <FileText className="size-5 text-primary" />
          Discovery Pro
        </span>
        <Link
          href={session ? "/dashboard" : "/login"}
          className="text-sm font-medium text-primary hover:underline"
        >
          {session ? "Open dashboard" : "Sign in"}
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="max-w-3xl font-heading text-4xl font-bold tracking-tight text-balance md:text-6xl">
          From client questionnaire to{" "}
          <span className="text-primary">product brief</span>, without the
          back-and-forth
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-muted-foreground text-pretty">
          Build a discovery questionnaire (or let AI draft one), share a single
          link with your client, and turn their answers into a structured,
          ready-to-scope product brief.
        </p>

        <Link
          href={session ? "/dashboard" : "/login"}
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-medium text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-primary/25"
        >
          {session ? "Go to dashboard" : "Get started"}
          <ArrowRight className="size-5" />
        </Link>

        <div className="mt-20 grid w-full gap-6 text-left sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-6">
            <ListChecks className="size-6 text-primary" />
            <h2 className="mt-4 font-heading font-semibold">
              Tailored questionnaires
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Start from a proven discovery template, edit every question, or
              have AI draft one for the specific client and project.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Send className="size-6 text-primary" />
            <h2 className="mt-4 font-heading font-semibold">
              One link for clients
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Clients answer step by step with autosave — no accounts, no
              attachments, no chasing.
            </p>
          </div>
          <div className="rounded-xl border bg-card p-6">
            <Sparkles className="size-6 text-primary" />
            <h2 className="mt-4 font-heading font-semibold">
              AI product briefs
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Answers become a structured brief: requirements, scope, risks,
              user stories and open questions — exportable as Markdown.
            </p>
          </div>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-5xl px-6 py-8 text-center text-sm text-muted-foreground">
        Discovery Pro
      </footer>
    </div>
  )
}

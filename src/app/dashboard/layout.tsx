import Link from "next/link"
import { redirect } from "next/navigation"
import { FileText } from "lucide-react"
import { getSession } from "@/lib/session"
import { UserMenu } from "@/components/user-menu"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session) redirect("/login")

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b bg-card">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-heading font-bold"
          >
            <FileText className="size-5 text-primary" />
            Discovery Pro
          </Link>
          <UserMenu name={session.user.name} email={session.user.email} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}

import Link from "next/link"
import { FileQuestion } from "lucide-react"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <FileQuestion className="size-12 text-muted-foreground/50" />
      <h1 className="font-heading text-2xl font-bold">Page not found</h1>
      <p className="max-w-sm text-muted-foreground">
        This page doesn&apos;t exist — the link may be incorrect or the
        session it pointed to has been deleted.
      </p>
      <Link href="/" className="mt-2 font-medium text-primary hover:underline">
        Go to the homepage
      </Link>
    </div>
  )
}

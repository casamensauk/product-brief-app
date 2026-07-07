import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { FileText } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { productBriefSchema } from "@/lib/schemas"
import { getSettings } from "@/lib/settings"
import { ProductBriefRead } from "@/components/brief-read-view"
import { SharePrintButton } from "@/components/share-print-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Product brief",
  robots: { index: false, follow: false },
}

export default async function SharedBriefPage({
  params,
}: {
  params: Promise<{ briefShareToken: string }>
}) {
  const { briefShareToken } = await params

  const brief = await prisma.projectBrief.findUnique({
    where: { briefShareToken },
    select: {
      clientName: true,
      projectName: true,
      generatedBrief: true,
      updatedAt: true,
    },
  })
  if (!brief) notFound()

  const parsed = productBriefSchema.safeParse(brief.generatedBrief)
  if (!brief.generatedBrief || !parsed.success) notFound()

  const settings = await getSettings()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card print:hidden">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
          <span className="flex min-w-0 items-center gap-2 font-heading font-bold">
            {settings.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- arbitrary white-label logo host
              <img
                src={settings.logoUrl}
                alt={settings.agencyName}
                className="size-6 rounded object-contain"
              />
            ) : (
              <FileText className="size-5 text-primary" />
            )}
            <span className="truncate">{settings.agencyName}</span>
          </span>
          <SharePrintButton />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="mb-8">
          <p className="text-sm font-medium text-muted-foreground">Product brief</p>
          <h1 className="mt-1 font-heading text-3xl font-bold">
            {brief.projectName || brief.clientName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground" suppressHydrationWarning>
            Prepared for {brief.clientName} by {settings.agencyName} ·{" "}
            {new Date(brief.updatedAt).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>

        <ProductBriefRead brief={parsed.data} />
      </main>
    </div>
  )
}

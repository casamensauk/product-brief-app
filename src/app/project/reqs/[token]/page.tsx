import ClientForm from "@/components/client-form"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"

export default async function ProjectRequirementsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  
  const brief = await prisma.projectBrief.findUnique({
    where: { shareToken: token }
  })

  if (!brief) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <ClientForm initialData={brief} token={token} />
    </div>
  )
}

import ProtectedRoute from "@/components/protected-route"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight">Developer Dashboard</h1>
        </header>
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
}

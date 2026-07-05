import ProtectedRoute from "@/components/protected-route"
import Image from "next/image"
import Link from "next/link"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      {/* TopNavBar */}
      <header className="bg-surface-container-lowest dark:bg-primary-container docked full-width top-0 z-40 border-b border-surface-variant dark:border-outline-variant">
        <div className="flex justify-between items-center w-full px-lg py-sm max-w-container-max mx-auto h-16">
          <div className="flex items-center gap-4">
            <span className="font-headline-md text-headline-md font-bold text-on-surface dark:text-on-primary">Discovery Pro</span>
          </div>
          <div className="flex items-center gap-md">
            <button className="text-secondary dark:text-secondary-fixed-dim hover:text-secondary transition-colors p-2 rounded-full hover:bg-surface-container-high">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-secondary dark:text-secondary-fixed-dim hover:text-secondary transition-colors p-2 rounded-full hover:bg-surface-container-high">
              <span className="material-symbols-outlined">help_outline</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant ml-2">
              <img
                className="w-full h-full object-cover"
                alt="Avatar"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAM_RFNItwlGtPjdJUdk0FYAipIak410n0OI_roq1y31ugLfFgBQyN4HWKWx-ZYEzw27Mv2_xzaq8qyUE0oDB8YCOZWcC8wbTdubm4xaze6MtuWxg-61dCSDXXoAJAaZtgEWy19H9YhQD4TtGas6cYaBoC9IuymfEzH5WmEbRLrePj8e1CYYySiwSf1ESA7uxf0wBnRgmYoTv3qh5w-E6ZvM_eElca0thwEufjGg52dc4WGq-4X8GMEsxRYA-fgsATEzc4gqjJZlpRa"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SideNavBar */}
        <aside className="hidden md:flex flex-col bg-surface dark:bg-primary-container h-full w-64 border-r border-surface-variant dark:border-outline-variant p-md space-y-2 sticky top-16">
          <div className="flex items-center gap-3 px-2 py-4 mb-4">
            <div className="w-10 h-10 rounded-lg bg-secondary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-on-secondary-container" style={{ fontVariationSettings: "'FILL' 1" }}>business</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface leading-tight">Project Alpha</h2>
              <p className="text-label-sm text-on-surface-variant opacity-70">Discovery Phase</p>
            </div>
          </div>
          <nav className="space-y-1">
            <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 bg-secondary-container dark:bg-on-secondary-fixed-variant text-on-secondary-container dark:text-on-secondary rounded-lg transition-all active:scale-95">
              <span className="material-symbols-outlined">folder_open</span>
              <span className="font-label-md text-label-md">My Projects</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all active:scale-95">
              <span className="material-symbols-outlined">description</span>
              <span className="font-label-md text-label-md">Templates</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all active:scale-95">
              <span className="material-symbols-outlined">settings</span>
              <span className="font-label-md text-label-md">Settings</span>
            </Link>
          </nav>
          <div className="mt-auto pt-md">
            <button className="w-full bg-secondary hover:bg-secondary-container text-on-secondary hover:text-on-secondary-container font-label-md text-label-md py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-[20px]">add</span>
              Add Requirement
            </button>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-background p-md lg:p-xl pb-24 lg:pb-xl">
          {children}
        </main>
      </div>

      {/* Mobile Bottom NavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-between items-center px-lg py-md bg-white dark:bg-primary-container z-50 shadow-sm border-t border-surface-variant dark:border-outline-variant">
        <button className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:bg-surface-container-high transition-transform active:scale-98">
          <span className="material-symbols-outlined">folder_open</span>
          <span className="font-label-sm text-label-sm mt-1">Projects</span>
        </button>
        <button className="flex flex-col items-center justify-center bg-secondary text-on-secondary rounded-full px-6 py-2 transition-transform active:scale-98">
          <span className="material-symbols-outlined">add</span>
          <span className="font-label-sm text-label-sm mt-1">New</span>
        </button>
        <button className="flex flex-col items-center justify-center text-on-surface-variant px-4 py-2 hover:bg-surface-container-high transition-transform active:scale-98">
          <span className="material-symbols-outlined">settings</span>
          <span className="font-label-sm text-label-sm mt-1">Settings</span>
        </button>
      </nav>
    </ProtectedRoute>
  )
}

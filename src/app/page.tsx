import Link from "next/link";
import { ArrowRight, LayoutDashboard, FileText } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 font-sans">
      <main className="flex flex-1 w-full max-w-5xl mx-auto flex-col items-center justify-center py-24 px-8 text-center">
        <div className="mb-8 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full inline-block">
          <FileText className="w-12 h-12 text-blue-600 dark:text-blue-400" />
        </div>
        
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
          Product Brief <span className="text-blue-600 dark:text-blue-500">Generator</span>
        </h1>
        
        <p className="max-w-2xl text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          A seamless way to gather, manage, and export comprehensive software project requirements. 
          Share frictionless forms with clients and generate standardized product briefs instantly.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-medium transition-all shadow-lg hover:shadow-blue-500/25"
          >
            <LayoutDashboard className="w-5 h-5" />
            Developer Dashboard
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-white px-8 py-4 rounded-xl font-medium transition-all"
          >
            Sign In
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </main>
    </div>
  );
}

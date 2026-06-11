import Link from 'next/link';
import { Database, GraduationCap } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="max-w-3xl w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="relative w-12 h-12 flex items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30">
            <Database className="w-6 h-6 text-white" />
            <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-700">
              <GraduationCap className="w-3 h-3 text-blue-400" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold">DBAcademy</h1>
        </div>

        <p className="text-slate-300 text-lg mb-8">
          Production-ready interactive database learning platform for students, schools, and companies.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/learn" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
            Open Learning App
          </Link>
          <Link href="/dashboard" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold transition-colors">
            Open Dashboard
          </Link>
          <Link href="/pricing" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-semibold transition-colors">
            View Pricing
          </Link>
        </div>
      </div>
    </main>
  );
}

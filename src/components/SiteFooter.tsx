import Link from 'next/link';
import { Database, GraduationCap } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="relative z-10 py-10" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#07090F' }}>
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
              <Database className="w-4 h-4 text-white" strokeWidth={2.5} />
              <div className="absolute -bottom-1 -right-1 rounded-full p-0.5" style={{ background: '#07090F', border: '1px solid rgba(255,255,255,0.08)' }}>
                <GraduationCap className="w-2.5 h-2.5" style={{ color: '#00C7BE' }} />
              </div>
            </div>
            <div>
              <div className="font-bold tracking-tight font-display text-sm" style={{ color: '#EDF1FA' }}>DBAcademy</div>
              <div className="text-xs" style={{ color: '#2E3A52' }}>Master Database Engineering</div>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm" style={{ color: '#2E3A52' }}>
            <Link href="/" className="hover:text-[#EDF1FA] transition-colors cursor-pointer">Home</Link>
            <Link href="/learn" className="hover:text-[#EDF1FA] transition-colors cursor-pointer">App</Link>
            <Link href="/pricing" className="hover:text-[#EDF1FA] transition-colors cursor-pointer">Pricing</Link>
            <Link href="/dashboard" className="hover:text-[#EDF1FA] transition-colors cursor-pointer">Dashboard</Link>
            <Link href="/auth/signin" className="hover:text-[#EDF1FA] transition-colors cursor-pointer">Sign In</Link>
          </nav>

          {/* Copy */}
          <div className="text-xs" style={{ color: '#2E3A52' }}>
            © {new Date().getFullYear()} DBAcademy
          </div>
        </div>
      </div>
    </footer>
  );
}

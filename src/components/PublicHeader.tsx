import Link from 'next/link';
import { Database, GraduationCap, Play } from 'lucide-react';

/** Top bar for public, crawlable pages (lessons). Server component. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-canvas/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="relative w-8 h-8 flex items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00C7BE, #0096A0)' }}>
            <Database className="w-4 h-4 text-white" strokeWidth={2.5} aria-hidden="true" />
            <span className="absolute -bottom-1 -right-1 rounded-full p-0.5 bg-canvas border border-white/10">
              <GraduationCap className="w-2.5 h-2.5 text-accent" aria-hidden="true" />
            </span>
          </span>
          <span className="text-base font-bold tracking-tight font-display text-ink">DBAcademy</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1 sm:gap-2">
          <Link href="/lessons" className="hidden sm:block px-3 py-1.5 rounded-lg text-sm text-muted hover:text-ink hover:bg-white/5">
            Lessons
          </Link>
          <Link href="/code" className="hidden sm:block px-3 py-1.5 rounded-lg text-sm text-muted hover:text-ink hover:bg-white/5">
            Code sandbox
          </Link>
          <Link
            href="/learn"
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-accent text-canvas hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Play className="w-3.5 h-3.5" aria-hidden="true" /> Start learning
          </Link>
        </nav>
      </div>
    </header>
  );
}

/** Renders schema.org data; `<` is escaped so content can't close the script tag. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

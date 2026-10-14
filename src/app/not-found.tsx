import Link from 'next/link';
import { SearchX, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-canvas text-ink">
      <div className="max-w-md text-center">
        <SearchX className="w-10 h-10 mx-auto mb-5 text-accent" aria-hidden="true" />
        <p className="font-mono text-sm text-muted mb-3">SELECT * FROM pages WHERE url = this_one; <span className="text-warm">-- 0 rows</span></p>
        <h1 className="heading-lg text-3xl mb-3">This page doesn&apos;t exist</h1>
        <p className="text-muted mb-8">The link may be old, or the address mistyped. Your progress is safe.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/learn"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent text-canvas hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Go to your lessons <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/10 text-ink hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Home page
          </Link>
        </div>
      </div>
    </main>
  );
}

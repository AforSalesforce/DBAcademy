'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlert, RotateCcw } from 'lucide-react';

/** Shown when a page crashes. Progress lives in the browser, so it's unaffected. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-canvas text-ink">
      <div className="max-w-md text-center" role="alert">
        <TriangleAlert className="w-10 h-10 mx-auto mb-5 text-warm" aria-hidden="true" />
        <h1 className="heading-lg text-3xl mb-3">Something went wrong</h1>
        <p className="text-muted mb-8">
          This page hit an unexpected error. Your lessons, notes and progress are saved in this browser and weren&apos;t affected.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-accent text-canvas hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-semibold border border-white/10 text-ink hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Home page
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs font-mono text-faint">Error reference: {error.digest}</p>}
      </div>
    </main>
  );
}

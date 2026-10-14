import { PublicHeader } from '@/components/PublicHeader';
import { SiteFooter } from '@/components/SiteFooter';

/** Layout for plain text pages (About, Privacy): public header, readable column, footer. */
export function ProsePage({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <PublicHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-accent mb-3">{eyebrow}</p>
        <h1 className="heading-xl text-4xl sm:text-5xl mb-8">{title}</h1>
        <div className="prose prose-invert max-w-none prose-headings:font-display prose-a:text-accent prose-code:before:content-none prose-code:after:content-none">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

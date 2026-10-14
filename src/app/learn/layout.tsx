import type { Metadata } from 'next';

/** /learn is a client page, so its metadata lives here. */
export const metadata: Metadata = {
  title: 'SQL playground and interactive lessons',
  description: 'Write and run SQL on real SQLite, PostgreSQL and NoSQL databases in your browser, with guided lessons and graded challenges. Free, no install.',
  alternates: { canonical: '/learn' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

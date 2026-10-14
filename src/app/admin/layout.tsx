import type { Metadata } from 'next';

/** Institution admin: private, never indexed. */
export const metadata: Metadata = {
  title: 'Institution admin',
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

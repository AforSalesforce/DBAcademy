import type { Metadata } from 'next';

/** Personal progress: nothing for search engines here. */
export const metadata: Metadata = {
  title: 'Your dashboard',
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

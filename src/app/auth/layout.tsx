import type { Metadata } from 'next';

/** Sign-in and sign-up: not useful in search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

import type { Metadata } from 'next';

/** /code is a client page, so its metadata lives here. */
export const metadata: Metadata = {
  title: 'JavaScript and Python sandbox',
  description: 'Run JavaScript and Python in your browser, with short guided lessons. Part of DBAcademy, the free interactive database course.',
  alternates: { canonical: '/code' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

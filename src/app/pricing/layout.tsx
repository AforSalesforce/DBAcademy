import type { Metadata } from 'next';

/** /pricing is a client page, so its metadata lives here. */
export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Every DBAcademy lesson is free. Pro removes the project and saved-query limits; Institution adds a teacher dashboard for your class.',
  alternates: { canonical: '/pricing' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}

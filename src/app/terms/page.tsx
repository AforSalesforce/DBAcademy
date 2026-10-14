import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/ProsePage';
import { accountsEnabled } from '@/lib/features';
import { CONTACT_EMAIL, CONTACT_URL, OWNER_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Terms of use',
  description: 'The rules for using DBAcademy, a free interactive SQL and database course run by Arabinda Ghosh.',
  alternates: { canonical: '/terms' },
};

/**
 * Keep this page true to what the site offers. If accounts, paid plans or a
 * new server feature change, update it in the same change.
 */
export default function TermsPage() {
  const accounts = accountsEnabled();
  return (
    <ProsePage eyebrow="Terms" title="Terms of use">
      <p><em>Last updated: 14 October 2026</em></p>

      <p>
        DBAcademy (www.dbacademy.online) is run by {OWNER_NAME}. By using the site you agree to these terms. If you
        don&apos;t agree, please don&apos;t use it.
      </p>

      <h2>The service</h2>
      <p>
        DBAcademy is an interactive course for learning SQL and databases. The lessons and practice databases run in your
        browser. We may add, change or remove lessons and features at any time, and we don&apos;t promise the site will
        always be available or free of errors.
      </p>

      <h2>Using the site fairly</h2>
      <p>Please don&apos;t:</p>
      <ul>
        <li>try to break, overload or get around the site&apos;s security, or access parts of it you aren&apos;t meant to;</li>
        <li>use the site to run harmful code, attack other systems or break the law;</li>
        <li>scrape or copy the lessons in bulk to republish them as your own.</li>
      </ul>
      <p>We may block access for anyone who does.</p>

      {accounts && (
        <>
          <h2>Accounts and paid plans</h2>
          <p>
            You&apos;re responsible for keeping your password safe and for what happens in your account. Paid plans are
            billed through Stripe, and you can manage or cancel your plan at any time from your dashboard.
            Code you run in Java, C, C++ or Go is sent to a code-execution service, so don&apos;t include passwords or
            personal data in it.
          </p>
        </>
      )}

      <h2>Your work and our content</h2>
      <p>
        The queries, code and notes you write are yours. The lessons, challenges, text and design of DBAcademy belong to{' '}
        {OWNER_NAME}. You&apos;re welcome to use them for your own learning and to share links to them.
      </p>

      <h2>No warranty</h2>
      <p>
        DBAcademy is provided &quot;as is&quot;. The lessons are for learning and may contain mistakes; check important work
        against official documentation. Progress is stored in your browser, so it can be lost if you clear your browsing
        data. To the extent the law allows, we aren&apos;t liable for any loss that comes from using the site.
      </p>

      <h2>Privacy</h2>
      <p>
        How your data is handled is explained on the <Link href="/privacy">privacy page</Link>.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms, and the date at the top shows when they last changed. These terms are governed by the
        laws of India.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or{' '}
        <a href={CONTACT_URL}>open an issue on GitHub</a>.
      </p>
    </ProsePage>
  );
}

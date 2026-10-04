import type { Metadata } from 'next';
import { ProsePage } from '@/components/ProsePage';
import { accountsEnabled } from '@/lib/features';
import { CONTACT_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Privacy',
  description: 'DBAcademy keeps your progress, notes and practice databases in your own browser. No account, no analytics, no ads.',
  alternates: { canonical: '/privacy' },
};

/**
 * Keep this page true to what the code does. If you add analytics, cookies,
 * a new third-party script or a server feature, update it in the same change.
 */
export default function PrivacyPage() {
  const accounts = accountsEnabled();
  return (
    <ProsePage eyebrow="Privacy" title="Your data stays in your browser">
      <p><em>Last updated: 4 October 2026</em></p>

      <h2>The short version</h2>
      <ul>
        <li>{accounts ? 'You can learn without an account.' : 'There are no accounts.'} We don&apos;t ask for your name or email to use the course.</li>
        <li>No analytics, no tracking, no ads{accounts ? '' : ', and no cookies'}.</li>
        <li>Your progress, notes, queries and practice databases are saved in your browser, on your device. We never receive them.</li>
      </ul>

      <h2>What is stored, and where</h2>
      <p>
        Your browser keeps your XP, streak and completed lessons, your lesson notes and drafts, saved queries and run history,
        and the practice databases you create. They live in your browser&apos;s local storage and IndexedDB for this site.
      </p>
      <p>
        That means clearing your browsing data for this site, using a private window, or switching to another device or
        browser starts you afresh. Nothing is backed up on our side.
      </p>

      <h2>What others can see</h2>
      <ul>
        <li>
          <strong>Hosting.</strong> The site is served by Vercel, which handles each request and keeps standard technical logs
          (such as IP address and browser type) to run and protect the service.
        </li>
        <li>
          <strong>Code libraries.</strong> The code editor and the Python runtime load from jsDelivr, and SQLite loads from
          cdnjs. Like any website, these services see the request, including your IP address.
        </li>
        <li>
          <strong>Your code runs locally.</strong> SQL, NoSQL, JavaScript and Python run in your browser.
          {accounts ? ' Java, C, C++ and Go, available to signed-in users, are sent to a code-execution service to run.' : ''}
        </li>
      </ul>

      {accounts && (
        <>
          <h2>If you create an account</h2>
          <p>
            Signing up stores your email, name and password (hashed) with Supabase, our account provider, and syncs your progress,
            notes and saved queries to it so you can use them on any device. Paid plans are handled by Stripe; we never see your
            card details. You can ask us to delete your account and its data.
          </p>
        </>
      )}

      <h2>Questions</h2>
      <p>
        To ask about your data or report a problem, <a href={CONTACT_URL}>open an issue on GitHub</a>.
      </p>
    </ProsePage>
  );
}

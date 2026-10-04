import type { Metadata } from 'next';
import Link from 'next/link';
import { ProsePage } from '@/components/ProsePage';
import { TOTAL_PATH_LESSONS } from '@/features/learn/curriculum/path';
import { CONTACT_URL, REPO_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About',
  description: 'What DBAcademy is, how its in-browser databases work, what the course covers, and who to thank for the pieces it is built on.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <ProsePage eyebrow="About" title="About DBAcademy">
      <p>
        DBAcademy is a free, hands-on course for learning SQL and databases. Every lesson ends with a challenge you solve by
        writing a real query, and your answer is checked instantly. There&apos;s nothing to install and no account to create.
      </p>

      <h2>How it works</h2>
      <p>The databases run inside your browser, compiled to WebAssembly:</p>
      <ul>
        <li><strong>SQLite</strong> through <a href="https://sql.js.org/">sql.js</a>.</li>
        <li>
          <strong>PostgreSQL</strong> through <a href="https://pglite.dev/">PGlite</a>, which is real PostgreSQL. It runs as a
          single user in your tab, so server features such as extensions, replication and multiple connections aren&apos;t available.
        </li>
        <li>
          <strong>NoSQL</strong>: a MongoDB-style document store built on <a href="https://github.com/kofrasa/mingo">mingo</a>.
          It supports the MongoDB query language for the lessons; it is not MongoDB itself.
        </li>
      </ul>

      <h2>What the course covers</h2>
      <p>
        {TOTAL_PATH_LESSONS} lessons: SELECT and WHERE (through a murder mystery), sorting, aggregates and GROUP BY, joins and
        subqueries, CREATE TABLE and foreign keys, PostgreSQL data types, string and window functions and CTEs, and document
        databases. <Link href="/lessons">See every lesson</Link>.
      </p>
      <p>
        Not covered yet: UPDATE and DELETE in depth, indexes and query performance, and transactions. It&apos;s a solid start
        in SQL, not a complete database engineering course.
      </p>

      <h2>Your data</h2>
      <p>
        Your progress, notes, queries and practice databases are stored in your browser, on your device. Read the{' '}
        <Link href="/privacy">privacy page</Link> for the details.
      </p>

      <h2>Credits</h2>
      <ul>
        <li>
          The murder mystery is inspired by the <a href="https://mystery.knightlab.com/">SQL Murder Mystery</a> from
          Northwestern University Knight Lab (MIT License). The people and records in our version are our own.
        </li>
        <li>
          Built with <a href="https://sql.js.org/">sql.js</a>, <a href="https://pglite.dev/">PGlite</a>,{' '}
          <a href="https://github.com/kofrasa/mingo">mingo</a>, the{' '}
          <a href="https://microsoft.github.io/monaco-editor/">Monaco editor</a> and{' '}
          <a href="https://pyodide.org/">Pyodide</a>.
        </li>
      </ul>

      <h2>Who runs it</h2>
      <p>
        DBAcademy is an independent project, and its source code is public on <a href={REPO_URL}>GitHub</a>. To report a
        problem or suggest a lesson, <a href={CONTACT_URL}>open an issue</a>.
      </p>
    </ProsePage>
  );
}

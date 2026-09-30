/**
 * The site's one official address. Every canonical URL, the sitemap,
 * robots.txt and social previews use it; Vercel redirects the bare domain
 * here, and next.config.ts redirects the *.vercel.app production alias.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.dbacademy.online').replace(/\/$/, '');

export const SITE_NAME = 'DBAcademy';

export const SITE_DESCRIPTION =
  'Free interactive SQL course: 22 lessons with graded challenges. Run PostgreSQL, SQLite and NoSQL in your browser, starting with a murder mystery.';

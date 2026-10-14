/**
 * The site's one official address. Every canonical URL, the sitemap,
 * robots.txt and social previews use it; Vercel redirects the bare domain
 * here, and next.config.ts redirects the *.vercel.app production alias.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.dbacademy.online').replace(/\/$/, '');

export const SITE_NAME = 'DBAcademy';

export const SITE_DESCRIPTION =
  'Free interactive SQL course: 22 lessons with graded challenges. Run PostgreSQL, SQLite and NoSQL in your browser, starting with a murder mystery.';

/** Public source code; GitHub Issues doubles as the contact channel. */
export const REPO_URL = 'https://github.com/AforSalesforce/DBAcademy';
export const CONTACT_URL = `${REPO_URL}/issues`;

/** Who runs the site, shown on /about and /terms and in the structured data. */
export const OWNER_NAME = 'Arabinda Ghosh';
export const CONTACT_EMAIL = 'ghosharabinda919@gmail.com';
export const OWNER_GITHUB_URL = 'https://github.com/AforSalesforce';
export const OWNER_LINKEDIN_URL = 'https://www.linkedin.com/in/arabinda-ghosh-a5715314b/';
/** Profile links that are set; an empty URL is left out everywhere. */
export const OWNER_PROFILES = [
  { label: 'GitHub', url: OWNER_GITHUB_URL },
  { label: 'LinkedIn', url: OWNER_LINKEDIN_URL },
].filter(p => p.url);

/** Public origin of the site, for absolute URLs (sitemap, robots). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://dba-cademy.vercel.app').replace(/\/$/, '');

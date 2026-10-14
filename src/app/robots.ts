import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Personal or account pages: nothing useful to index.
      disallow: ['/api/', '/auth/', '/dashboard', '/admin'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

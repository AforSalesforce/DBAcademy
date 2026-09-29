import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { accountsEnabled } from '@/lib/features';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '/', priority: 1 },
    { path: '/learn', priority: 0.9 },
    { path: '/code', priority: 0.6 },
    // Pricing only exists while accounts are switched on.
    ...(accountsEnabled() ? [{ path: '/pricing', priority: 0.5 }] : []),
  ];
  return pages.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'weekly', priority }));
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { accountsEnabled } from '@/lib/features';
import { LEARNING_PATH } from '@/features/learn/curriculum/path';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = [
    { path: '/', priority: 1 },
    { path: '/lessons', priority: 0.9 },
    // The crawlable lesson pages are where search traffic lands.
    ...LEARNING_PATH.map(step => ({ path: `/lessons/${step.slug}`, priority: 0.8 })),
    { path: '/learn', priority: 0.7 },
    { path: '/code', priority: 0.5 },
    // Pricing only exists while accounts are switched on.
    ...(accountsEnabled() ? [{ path: '/pricing', priority: 0.5 }] : []),
  ];
  return pages.map(({ path, priority }) => ({ url: `${SITE_URL}${path}`, changeFrequency: 'weekly', priority }));
}

import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

/** /sitemap.xml: the pages worth finding. The arcade and /margin/wall are noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly') => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  });
  return [
    page('', 1, 'monthly'),
    page('/projects', 0.9, 'monthly'),
    page('/casestudies', 0.85, 'monthly'),
    page('/works', 0.8, 'monthly'),
    page('/beyond', 0.7, 'monthly'),
    page('/margin', 0.5, 'weekly'),
  ];
}

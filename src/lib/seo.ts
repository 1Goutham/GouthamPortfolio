import type { Metadata } from 'next';

/** The live site; link previews and canonical URLs are built on it. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://1goutham.space';

/**
 * Title, description and the link preview (LinkedIn, WhatsApp, X, Slack)
 * for one page. The preview images are made by scripts/og/render.js into
 * public/og/<image>.jpg.
 */
export function pageMeta({
  title,
  description,
  path,
  image,
  alt,
}: {
  title: string;
  description: string;
  path: string;
  image: 'home' | 'beyond' | 'margin' | 'works' | 'projects' | 'arcade';
  alt: string;
}): Metadata {
  const img = { url: `/og/${image}.jpg`, width: 1200, height: 630, alt, type: 'image/jpeg' };
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: 'website', siteName: 'Goutham G', locale: 'en_IN', url: path, title, description, images: [img] },
    twitter: { card: 'summary_large_image', title, description, images: [img] },
  };
}

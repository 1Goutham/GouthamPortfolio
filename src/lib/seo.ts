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

const PERSON_ID = `${SITE_URL}/#person`;

/** Who the site is about, for search engines (schema.org JSON-LD). */
export const personLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Goutham G',
      alternateName: 'Goutham Gopinath',
      jobTitle: 'AI Product Engineer & Designer',
      description:
        'AI product engineer and designer building digital products with AI, code and design: full-stack web apps, AI tools and interfaces.',
      url: SITE_URL,
      image: `${SITE_URL}/beyondpic.png`,
      email: 'mailto:gouthamgopinath.tsi@gmail.com',
      address: { '@type': 'PostalAddress', addressLocality: 'Coimbatore', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
      knowsAbout: [
        'AI product engineering',
        'Full-stack web development',
        'Retrieval-augmented generation',
        'Product design',
        'UI/UX design',
        'Next.js',
        'React',
        'TypeScript',
        'Node.js',
      ],
      sameAs: [
        'https://www.linkedin.com/in/goutham-g-98a0ba253/',
        'https://github.com/1Goutham',
        'https://www.instagram.com/tanger.ineee/',
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'Goutham G',
      inLanguage: 'en',
      publisher: { '@id': PERSON_ID },
    },
  ],
};

/** 1G-works, his studio, on /works. */
export const worksLd = {
  '@context': 'https://schema.org',
  '@type': 'ProfessionalService',
  '@id': `${SITE_URL}/works#studio`,
  name: '1G-works',
  slogan: 'Ideas into digital impact',
  description: '1G-works brings design, technology and AI together to help businesses build a stronger digital presence.',
  url: `${SITE_URL}/works`,
  image: `${SITE_URL}/og/works.jpg`,
  founder: { '@type': 'Person', '@id': PERSON_ID, name: 'Goutham G' },
  areaServed: 'Worldwide',
  address: { '@type': 'PostalAddress', addressLocality: 'Coimbatore', addressRegion: 'Tamil Nadu', addressCountry: 'IN' },
  knowsAbout: ['Brand & creative', 'Web & digital', 'Digital growth', 'Software & AI'],
};

/** A <script type="application/ld+json"> body, safe to inline. */
export const ld = (data: object) => ({ __html: JSON.stringify(data).replace(/</g, '\\u003c') });

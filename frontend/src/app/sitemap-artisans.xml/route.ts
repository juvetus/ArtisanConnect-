import { CATEGORIES } from '@/lib/categories';
import { CITIES, slugify } from '@/lib/locations';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

/** Métiers les plus recherchés : inutile d'exposer les 80 catégories × 10 villes. */
const INDEXED_CATEGORIES = [
  'plomberie',
  'electricite',
  'menuiserie',
  'couture',
  'maconnerie',
  'coiffure',
  'reparation',
  'ameublement',
  'vannerie',
  'renovation',
  'soudure',
  'froid',
];

export const revalidate = 86400;

export function GET() {
  const lastmod = new Date().toISOString().split('T')[0];
  const categories = INDEXED_CATEGORIES.filter((value) => CATEGORIES.some((item) => item.value === value));

  const paths = [
    '/trouver-un-artisan',
    ...CITIES.map((city) => `/trouver-un-artisan/${slugify(city)}`),
    ...categories.flatMap((category) => [
      `/trouver-un-artisan/${category}`,
      ...CITIES.map((city) => `/trouver-un-artisan/${category}/${slugify(city)}`),
    ]),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths
  .map(
    (path) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/trouver-un-artisan' ? '0.9' : '0.6'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

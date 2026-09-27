import { CATEGORIES } from '@/lib/categories';
import { CITIES, slugify } from '@/lib/locations';
import { api } from '@/lib/api';

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
const MIN_INDEXABLE_ARTISANS = 2;
const MIN_INDEXABLE_OFFERS = 2;

async function hasQualityResults(category?: string, city?: string) {
  try {
    const results = await api.publicArtisans({ take: 48, category, city });
    const offers = results.reduce((sum, artisan) => sum + (artisan.offerCount ?? 0), 0);
    return results.length >= MIN_INDEXABLE_ARTISANS && offers >= MIN_INDEXABLE_OFFERS;
  } catch {
    return false;
  }
}

export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'false') {
    return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' + `${siteUrl}/trouver-un-artisan` + '</loc></url></urlset>', {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  }

  const lastmod = new Date().toISOString().split('T')[0];
  const categories = INDEXED_CATEGORIES.filter((value) => CATEGORIES.some((item) => item.value === value));
  const candidates: { path: string; category?: string; city?: string }[] = [
    { path: '/trouver-un-artisan' },
    ...CITIES.map((city) => ({ path: `/trouver-un-artisan/${slugify(city)}`, city })),
    ...categories.flatMap((category) => [
      { path: `/trouver-un-artisan/${category}`, category },
      ...CITIES.map((city) => ({ path: `/trouver-un-artisan/${category}/${slugify(city)}`, category, city })),
    ]),
  ];
  const quality = await Promise.all(candidates.map((candidate) => candidate.path === '/trouver-un-artisan' || hasQualityResults(candidate.category, candidate.city)));
  const paths = candidates.filter((_, index) => quality[index]).map((candidate) => candidate.path);

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

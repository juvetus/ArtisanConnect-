import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { CITIES, NEIGHBORHOODS, labelFromSlug, slugify } from '@/lib/locations';
import { ArtisanCard } from '@/components/ArtisanCard';
import { ArtisanBadgeLegend, ArtisanFilters } from '@/components/ArtisanFilters';
import type { PublicArtisan } from '@/lib/types';
import { DirectoryIntro } from '@/components/DirectoryIntro';
import { DirectoryResultsInfo } from '@/components/DirectoryResultsInfo';
import { DirectorySectionLabel } from '@/components/DirectorySectionLabel';
import { DirectoryNoResultsAction } from '@/components/DirectoryNoResultsAction';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';
const MIN_INDEXABLE_ARTISANS = 2;
const MIN_INDEXABLE_OFFERS = 2;

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** `/trouver-un-artisan/[metier]/[ville]` : le premier segment est un métier connu, le second une ville. */
function parseSlug(slug: string[] = []) {
  const [first, second] = slug;
  const category = CATEGORIES.find((item) => item.value === first)?.value;
  const citySlug = category ? second : first;
  return { category, citySlug };
}

function buildTitle(category?: string, cityLabel?: string) {
  const trade = category ? categoryLabel(category) : 'Artisans';
  return cityLabel ? `${trade} à ${cityLabel}` : `${trade} au Cameroun`;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const query = await searchParams;
  const { category, citySlug } = parseSlug(slug);
  const neighborhoodSlug = typeof query.quartier === 'string' ? query.quartier : undefined;
  const cityLabel = citySlug ? labelFromSlug(citySlug) : undefined;
  const placeLabel = neighborhoodSlug ? `${labelFromSlug(neighborhoodSlug)}, ${cityLabel ?? 'Cameroun'}` : cityLabel;
  const title = buildTitle(category, placeLabel);
  const canonicalPath = `/trouver-un-artisan${[category, citySlug].filter(Boolean).map((part) => `/${part}`).join('')}`;
  let quality = { artisans: 0, offers: 0 };
  if (!neighborhoodSlug && typeof query.q !== 'string') {
    try {
      const results = await api.publicArtisans({ take: 48, category, city: cityLabel });
      quality = { artisans: results.length, offers: results.reduce((sum, artisan) => sum + (artisan.offerCount ?? 0), 0) };
    } catch {
      quality = { artisans: 0, offers: 0 };
    }
  }
  const indexable = quality.artisans >= MIN_INDEXABLE_ARTISANS && quality.offers >= MIN_INDEXABLE_OFFERS;

  return {
    title,
    description: `Trouvez ${title.toLowerCase()} : profils vérifiés, réalisations, avis clients et demande de devis en ligne sur ArtisanConnect.`,
    alternates: { canonical: `${siteUrl}${canonicalPath}` },
    openGraph: { title, url: `${siteUrl}${canonicalPath}`, type: 'website' },
    // Les combinaisons filtrées ne doivent pas diluer l'indexation des pages canoniques.
    robots: neighborhoodSlug || typeof query.q === 'string' || !indexable ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ArtisansDirectoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const { category, citySlug } = parseSlug(slug);
  const neighborhoodSlug = typeof query.quartier === 'string' ? query.quartier : undefined;
  const verified = query.verifie === '1';
  const minRating = typeof query.note === 'string' ? Number(query.note) : 0;
  const search = typeof query.q === 'string' ? query.q : undefined;
  const availability = query.disponibilite === 'available' || query.disponibilite === 'busy' || query.disponibilite === 'unavailable'
    ? query.disponibilite
    : undefined;
  const maxPrice = typeof query.prixMax === 'string' && Number.isFinite(Number(query.prixMax)) ? Number(query.prixMax) : undefined;
  const maxResponseMinutes = typeof query.reponseMax === 'string' && Number.isFinite(Number(query.reponseMax)) ? Number(query.reponseMax) : undefined;
  const latitude = typeof query.lat === 'string' && Number.isFinite(Number(query.lat)) ? Number(query.lat) : undefined;
  const longitude = typeof query.lon === 'string' && Number.isFinite(Number(query.lon)) ? Number(query.lon) : undefined;
  const requestedDistance = typeof query.distanceKm === 'string' && Number.isFinite(Number(query.distanceKm)) ? Number(query.distanceKm) : undefined;
  const distanceKm = latitude !== undefined && longitude !== undefined ? requestedDistance : undefined;

  const cityLabel = citySlug ? labelFromSlug(citySlug) : undefined;
  const neighborhoodLabel = neighborhoodSlug ? labelFromSlug(neighborhoodSlug) : undefined;

  let artisans: PublicArtisan[] = [];
  try {
    artisans = await api.publicArtisans({
      take: 48,
      q: search,
      category,
      city: cityLabel,
      neighborhood: neighborhoodLabel,
      verified: verified || undefined,
      minRating: minRating || undefined,
      availability,
      maxPrice,
      maxResponseMinutes,
      includeResponseStats: true,
      latitude: distanceKm ? latitude : undefined,
      longitude: distanceKm ? longitude : undefined,
      maxDistanceKm: distanceKm,
    });
  } catch {
    artisans = [];
  }

  const title = buildTitle(category, neighborhoodLabel ? `${neighborhoodLabel}, ${cityLabel}` : cityLabel);
  const suggestedNeighborhoods = citySlug ? NEIGHBORHOODS[citySlug] ?? [] : [];
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    numberOfItems: artisans.length,
    itemListElement: artisans.slice(0, 20).map((artisan, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${siteUrl}/shop/${artisan.id}`,
      name: artisan.name,
    })),
  };

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />

      <header>
        <DirectoryIntro />
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{title}</h1>
      </header>

      <ArtisanFilters
        category={category}
        city={cityLabel}
        neighborhood={neighborhoodLabel}
        verified={verified}
        minRating={minRating}
        availability={availability}
        maxPrice={maxPrice}
        maxResponseMinutes={maxResponseMinutes}
        distanceKm={distanceKm}
        latitude={latitude}
        longitude={longitude}
        query={search}
      />

      <ArtisanBadgeLegend />

      {artisans.length ? (
        <>
          <DirectoryResultsInfo count={artisans.length} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((artisan) => (
              <ArtisanCard key={artisan.id} artisan={artisan} />
            ))}
          </div>
        </>
      ) : (
        <DirectoryNoResultsAction category={category} city={cityLabel} neighborhood={neighborhoodLabel} query={search} />
      )}

      {suggestedNeighborhoods.length ? (
        <section className="space-y-2 border-t border-stone-200 pt-6">
          <DirectorySectionLabel kind="neighborhood" />
          <div className="flex flex-wrap gap-2">
            {suggestedNeighborhoods.map((item) => (
              <Link
                key={item}
                href={`/trouver-un-artisan${[category, citySlug].filter(Boolean).map((part) => `/${part}`).join('')}?quartier=${slugify(item)}`}
                className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:border-amber-600"
              >
                {category ? `${categoryLabel(category)} à ${item}` : item}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-2 border-t border-stone-200 pt-6">
        <DirectorySectionLabel kind="frequent" />
        <div className="flex flex-wrap gap-2">
          {CITIES.slice(0, 6).map((item) => (
            <Link
              key={item}
              href={`/trouver-un-artisan${category ? `/${category}` : ''}/${slugify(item)}`}
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm text-stone-700 hover:border-amber-600"
            >
              {category ? `${categoryLabel(category)} à ${item}` : `Artisans à ${item}`}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

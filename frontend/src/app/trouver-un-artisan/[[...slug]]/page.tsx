import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { CATEGORIES, categoryLabel } from '@/lib/categories';
import { CITIES, NEIGHBORHOODS, labelFromSlug, slugify } from '@/lib/locations';
import { ArtisanCard } from '@/components/ArtisanCard';
import { ArtisanFilters } from '@/components/ArtisanFilters';
import type { PublicArtisan } from '@/lib/types';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

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

  return {
    title,
    description: `Trouvez ${title.toLowerCase()} : profils vérifiés, réalisations, avis clients et demande de devis en ligne sur ArtisanConnect.`,
    alternates: { canonical: `${siteUrl}${canonicalPath}` },
    openGraph: { title, url: `${siteUrl}${canonicalPath}`, type: 'website' },
    // Les combinaisons filtrées ne doivent pas diluer l'indexation des pages canoniques.
    robots: neighborhoodSlug || typeof query.q === 'string' ? { index: false, follow: true } : { index: true, follow: true },
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
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Annuaire des artisans</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{title}</h1>
        <p className="mt-2 text-stone-600">
          Comparez les profils, consultez les avis et demandez un devis gratuit en quelques minutes.
        </p>
      </header>

      <ArtisanFilters
        category={category}
        city={cityLabel}
        neighborhood={neighborhoodLabel}
        verified={verified}
        minRating={minRating}
        query={search}
      />

      {artisans.length ? (
        <>
          <p className="text-sm text-stone-600">{artisans.length} artisan(s) correspondant à votre recherche.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((artisan) => (
              <ArtisanCard key={artisan.id} artisan={artisan} />
            ))}
          </div>
        </>
      ) : (
        <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900">
            Aucun artisan ne correspond encore à cette recherche. Publiez votre besoin : nous le transmettons aux
            artisans concernés.
          </p>
          <Link
            href="/customer-requests"
            className="inline-flex rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Demander un devis
          </Link>
        </div>
      )}

      {suggestedNeighborhoods.length ? (
        <section className="space-y-2 border-t border-stone-200 pt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">Par quartier</h2>
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">Recherches fréquentes</h2>
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

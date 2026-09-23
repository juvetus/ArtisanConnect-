'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { Pagination } from '@/components/Pagination';
import { ArtisanCard } from '@/components/ArtisanCard';
import { DemoBadge } from '@/components/DemoBadge';
import { VerificationBadge } from '@/components/VerificationBadge';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';
import { demoArtisans, demoListings, demoServices } from '@/lib/demo-content';
import { useLanguage } from '@/lib/language-context';
import { CITIES, NEIGHBORHOODS, slugify } from '@/lib/locations';
import { trackEvent } from '@/lib/analytics';
import { resolveMediaUrl } from '@/lib/media';
import { formatXAF } from '@/lib/format';
import type { PublicArtisan, Service } from '@/lib/types';

/** Métiers les plus recherchés par les clients de Yaoundé. */
const POPULAR_CATEGORIES = [
  'plomberie',
  'electricite',
  'menuiserie',
  'couture',
  'maconnerie',
  'coiffure',
  'reparation',
  'ameublement',
  'vannerie',
];

type CatalogFilters = {
  q?: string;
  category?: string;
  type?: 'product' | 'service';
  city?: string;
  neighborhood?: string;
  minPrice?: number;
  maxPrice?: number;
};

export default function HomePage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<CatalogFilters>({});
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'women' | 'cooperatives'>('all');
  const [listingPage, setListingPage] = useState(0);
  const [draftQuery, setDraftQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    ['listings', filters, listingPage],
    ([, params, page]) => api.listings({ ...(params as CatalogFilters), skip: (page as number) * 12, take: 12 }),
    // Sans cela, un retour sur l'onglet relancerait la requête et donc le défilement.
    { revalidateOnFocus: false },
  );

  const [listings, total] = data ?? [[], 0];
  const { data: services } = useSWR<Service[]>(
    'approved-services-home',
    async () => (await api.getApprovedServices(6)) as Service[],
  );
  const { data: artisans } = useSWR<PublicArtisan[]>('home-public-artisans', () => api.publicArtisans({ take: 6 }));
  const { data: matchingArtisans } = useSWR<PublicArtisan[]>(
    filters.q ? ['home-matching-artisans', filters.q, filters.city, filters.neighborhood, filters.category] : null,
    ([, q, city, neighborhood, category]) =>
      api.publicArtisans({
        take: 3,
        q: q as string,
        city: city as string | undefined,
        neighborhood: neighborhood as string | undefined,
        category: category as string | undefined,
      }),
    { revalidateOnFocus: false },
  );
  const hasFilter = Object.values(filters).some((value) => value !== undefined && value !== '');

  const updateFilter = (patch: Partial<CatalogFilters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      // Un quartier n'a de sens qu'associé à sa ville.
      if (patch.city !== undefined) next.neighborhood = undefined;
      return Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== undefined && value !== ''),
      ) as CatalogFilters;
    });
    setListingPage(0);
  };

  // Le défilement attend l'arrivée des résultats : tant que SWR n'a pas répondu, la page
  // a encore la hauteur de la liste précédente et la cible serait mal placée.
  useEffect(() => {
    if (!data || !hasFilter) return;
    resultsRef.current?.scrollIntoView({ block: 'start' });
  }, [data, hasFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftQuery.trim()) trackEvent('search', { label: draftQuery.trim(), city: filters.city });
    updateFilter({ q: draftQuery || undefined });
  };

  const selectCategory = (value: string) => {
    setShowCategories(false);
    if (value) trackEvent('category_view', { label: value, city: filters.city });
    updateFilter({ category: value || undefined });
  };

  const resetFilters = () => {
    setDraftQuery('');
    setFilters({});
    setListingPage(0);
  };

  const activeCategory = CATEGORIES.find((c) => c.value === filters.category);
  const availableNeighborhoods = filters.city ? NEIGHBORHOODS[slugify(filters.city)] ?? [] : [];
  const visibleListings = listings.length ? listings : !hasFilter && !isLoading ? demoListings : [];
  const visibleTotal = listings.length ? total : visibleListings.length;
  const visibleServices = services?.length ? services : demoServices;
  const featuredProducts = visibleListings.slice(0, 6);
  const showsDemoContent = !listings.length && !services?.length && !artisans?.length && !isLoading;

  return (
    <div className="space-y-8">
      {showsDemoContent ? (
        <p className="rounded-lg border border-dashed border-stone-400 bg-stone-100 px-4 py-3 text-sm text-stone-700">
          <strong className="font-semibold">Contenus de démonstration.</strong> Les artisans, produits et services
          marqués « Démonstration » sont fictifs et servent à illustrer la plateforme pendant le pilote.
        </p>
      ) : null}
      <section className="overflow-hidden rounded-xl bg-stone-900 text-white">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="px-6 py-10 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{t('home_market_badge')}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">{t('home_hero_title')}</h1>
            <p className="mt-3 max-w-2xl text-stone-200">
              {t('home_hero_subtitle')}
            </p>
          </div>
          <div className="min-h-64 bg-[url('/images/african-market-artisan-stockcake.jpg')] bg-cover bg-center" aria-hidden />
        </div>
      </section>

      <section aria-label={t('home_paths_badge')} className="space-y-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_paths_badge')}</p>
          <h2 className="text-2xl font-semibold text-stone-900">{t('home_choose_path_title')}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: t('home_find_path_title'), desc: t('home_find_path_desc'), href: '/trouver-un-artisan', icon: '🔎', className: 'border-amber-300 bg-amber-50' },
          { title: t('home_buy_path_title'), desc: t('home_buy_path_desc'), href: '/annonces', icon: '🧺', className: 'border-stone-200 bg-white' },
        ].map((path) => (
          <Link
            key={path.title}
            href={path.href}
            className={`rounded-xl border p-5 transition hover:border-amber-600 hover:shadow-sm ${path.className}`}
          >
            <span aria-hidden className="text-3xl">{path.icon}</span>
            <p className="mt-3 text-xl font-semibold text-stone-900">{path.title}</p>
            <p className="mt-1 text-sm text-stone-600">{path.desc}</p>
          </Link>
        ))}
        </div>
        <Link href="/register" className="inline-block text-sm font-medium text-amber-800 underline underline-offset-4 hover:text-amber-950">
          {t('home_hero_secondary')}
        </Link>
      </section>

      <details className="rounded-lg border border-stone-200 bg-white p-4">
        <summary className="cursor-pointer text-lg font-semibold text-stone-900">{t('home_choose_trade')}</summary>
        <div className="mt-4 flex flex-wrap gap-2">
          {POPULAR_CATEGORIES.map((value) => {
            const category = CATEGORIES.find((item) => item.value === value);
            if (!category) return null;
            return (
              <button
                key={value}
                onClick={() => selectCategory(value)}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  filters.category === value
                    ? 'border-amber-700 bg-amber-700 text-white'
                    : 'border-stone-300 bg-white text-stone-700 hover:border-amber-600'
                }`}
              >
                <span aria-hidden className="mr-1.5">{category.icon}</span>
                {categoryLabel(value)}
              </button>
            );
          })}
        </div>
      </details>

      <section id="artisans" className="scroll-mt-6 space-y-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_recommended_badge')}</p>
          <h2 className="text-2xl font-semibold text-stone-900">{t('home_recommended_title')}</h2>
          <p className="mt-1 text-sm text-stone-600">{t('home_recommended_desc')}</p>
        </div>
        {artisans?.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artisans.map((artisan) => (
              <ArtisanCard key={artisan.id} artisan={artisan} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{t('home_artisans_empty')}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {demoArtisans.map((artisan) => (
                <article key={artisan.id} className="relative overflow-hidden rounded-xl border border-dashed border-stone-300 bg-stone-50">
                  <DemoBadge className="absolute right-2 top-2 z-10 shadow" />
                  <img src={artisan.imageUrl} alt={artisan.name} className="h-28 w-full object-cover opacity-80" />
                  <div className="p-4">
                    <h3 className="font-semibold text-stone-900">{artisan.name}</h3>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700">{artisan.specialty}</p>
                    <p className="mt-1 text-sm text-stone-600">{artisan.city}</p>
                    <p className="mt-2 text-xs text-stone-500">Profil fictif, présenté à titre d’exemple.</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 overflow-hidden rounded-xl border border-stone-200 bg-white p-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid grid-cols-2 gap-3">
          <img src="/images/african-marketplace-artisan-stockcake.jpg" alt="Stand artisanal coloré avec vannerie et décorations" className="col-span-2 h-60 w-full rounded-lg object-cover" />
          <img src="/images/african-market-artisan-stockcake.jpg" alt="Marché artisanal camerounais avec textiles et poteries" className="h-36 w-full rounded-lg object-cover" />
          <img src="/images/infusing-personal-style-into-your-craft-market-stall.jpg" alt="Stand de créations artisanales avec textiles et objets décoratifs" className="h-36 w-full rounded-lg object-cover" />
        </div>
        <div className="flex flex-col justify-center p-2 lg:p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_visual_badge')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{t('home_visual_title')}</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {t('home_visual_desc')}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-800">{t('home_visual_product_badge')}</span>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">{t('home_visual_artisans_badge')}</span>
            <span className="rounded-full bg-green-50 px-3 py-1 text-green-800">{t('home_visual_whatsapp_badge')}</span>
          </div>
        </div>
      </section>

      <section id="produits-populaires" className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_featured_products_badge')}</p>
            <h2 className="text-2xl font-semibold text-stone-900">{t('home_featured_products_title')}</h2>
          </div>
          <Link href="/annonces" className="text-sm font-medium text-amber-700 hover:text-amber-800">{t('home_view_catalog')}</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t('home_trust_verified_title'), t('home_trust_verified_desc')],
          [t('home_trust_payment_title'), t('home_trust_payment_desc')],
          [t('home_trust_delivery_title'), t('home_trust_delivery_desc')],
          [t('home_trust_digital_title'), t('home_trust_digital_desc')],
        ].map(([title, description]) => (
          <div key={title} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="font-semibold text-stone-900">{title}</p>
            <p className="mt-2 text-sm text-stone-600">{description}</p>
          </div>
        ))}
      </section>

      <section id="catalogue" className="space-y-4 border-t border-stone-200 pt-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_catalog_badge')}</p>
          <h2 className="text-2xl font-semibold text-stone-900">{t('home_catalog_title')}</h2>
        </div>
        <form onSubmit={handleSearch} className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-stone-400"
            >
              🔍
            </span>
            <input
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              aria-label={t('search_placeholder')}
              placeholder={t('search_placeholder')}
              className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-12 pr-4 text-base text-stone-900 outline-none placeholder:text-stone-500 focus:border-amber-600"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white hover:bg-stone-800"
          >
            {t('search_button')}
          </button>
        </form>

        <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium text-stone-700">
            Type
            <select
              value={filters.type ?? ''}
              onChange={(event) => updateFilter({ type: (event.target.value || undefined) as CatalogFilters['type'] })}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            >
              <option value="">Produits et services</option>
              <option value="product">Produits</option>
              <option value="service">Services</option>
            </select>
          </label>

          <label className="text-sm font-medium text-stone-700">
            Ville
            <select
              value={filters.city ?? ''}
              onChange={(event) => updateFilter({ city: event.target.value || undefined })}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            >
              <option value="">Toutes les villes</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-stone-700">
            Quartier
            <select
              value={filters.neighborhood ?? ''}
              onChange={(event) => updateFilter({ neighborhood: event.target.value || undefined })}
              disabled={!availableNeighborhoods.length}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600 disabled:bg-stone-100"
            >
              <option value="">Tous les quartiers</option>
              {availableNeighborhoods.map((neighborhood) => (
                <option key={neighborhood} value={neighborhood}>{neighborhood}</option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-stone-700">
            Budget min. (FCFA)
            <input
              type="number"
              min={0}
              step={500}
              value={filters.minPrice ?? ''}
              onChange={(event) => updateFilter({ minPrice: event.target.value ? Number(event.target.value) : undefined })}
              placeholder="0"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            />
          </label>

          <label className="text-sm font-medium text-stone-700">
            Budget max. (FCFA)
            <input
              type="number"
              min={0}
              step={500}
              value={filters.maxPrice ?? ''}
              onChange={(event) => updateFilter({ maxPrice: event.target.value ? Number(event.target.value) : undefined })}
              placeholder="Sans limite"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            />
          </label>
        </div>
      </section>

      <div ref={resultsRef} className="scroll-mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCategories((open) => !open)}
            aria-expanded={showCategories}
            className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm hover:border-amber-600"
          >
            {t('filter_category')}
            <span className={`transition-transform ${showCategories ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {activeCategory ? (
            <button
              onClick={() => selectCategory('')}
              className="flex items-center gap-2 rounded-full border border-amber-700 bg-amber-700 px-4 py-1.5 text-sm text-white"
            >
              {categoryLabel(activeCategory.value)}
              <span aria-hidden>✕</span>
              <span className="sr-only">Retirer le filtre</span>
            </button>
          ) : (
            <span className="text-sm text-stone-500">{t('filter_all_categories')}</span>
          )}
          <button
            onClick={() => setAudienceFilter((prev) => (prev === 'women' ? 'all' : 'women'))}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              audienceFilter === 'women'
                ? 'border-rose-600 bg-rose-600 font-medium text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-rose-500 hover:text-rose-700'
            }`}
          >
            {t('filter_women')}
          </button>

          <button
            onClick={() => setAudienceFilter((prev) => (prev === 'cooperatives' ? 'all' : 'cooperatives'))}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              audienceFilter === 'cooperatives'
                ? 'border-indigo-600 bg-indigo-600 font-medium text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-indigo-500 hover:text-indigo-700'
            }`}
          >
            {t('filter_coop')}
          </button>

          {hasFilter ? (
            <button
              onClick={resetFilters}
              className="ml-auto text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800"
            >
              Réinitialiser les filtres
            </button>
          ) : null}
        </div>

        {showCategories &&
          [
            { title: t('filter_crafts'), items: PRODUCT_CATEGORIES },
            { title: t('filter_services'), items: SERVICE_CATEGORIES },
          ].map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                {group.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => selectCategory(c.value)}
                    className={`rounded-full border px-4 py-1.5 text-sm ${
                      filters.category === c.value
                        ? 'border-amber-700 bg-amber-700 text-white'
                        : 'border-stone-300 bg-white hover:border-amber-600'
                    }`}
                  >
                    {categoryLabel(c.value)}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>

      {filters.q && matchingArtisans?.length ? (
        <section className="space-y-4 rounded-xl border border-amber-200 bg-amber-50/60 p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Artisans correspondants</p>
              <h2 className="text-xl font-semibold text-stone-900">
                Ces artisans correspondent à « {filters.q} »
              </h2>
            </div>
            <Link
              href={`/trouver-un-artisan${filters.category ? `/${filters.category}` : ''}`}
              className="text-sm font-medium text-amber-700 hover:text-amber-800"
            >
              Voir tous les artisans →
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {matchingArtisans.map((artisan) => (
              <ArtisanCard key={artisan.id} artisan={artisan} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="space-y-5">
        {isLoading ? (
          <p className="text-stone-600">{t('action_loading')}</p>
        ) : visibleListings.length === 0 ? (
          <p className="rounded-md border border-stone-200 bg-white p-8 text-center text-stone-600">
            Aucune annonce ne correspond à votre recherche.
          </p>
        ) : (
          <>
            {error && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {t('home_catalog_api_fallback')}
              </p>
            )}
            <p className="text-sm text-stone-600">
              {t('announcements_count', { count: visibleTotal })}
              {filters.q && ` pour « ${filters.q} »`}
              {audienceFilter === 'women' && ` · ${t('filter_women_active')}`}
              {audienceFilter === 'cooperatives' && ` · ${t('filter_coop_active')}`}
              {!listings.length && !hasFilter && ` · ${t('home_catalog_demo_note')}`}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(audienceFilter === 'women'
                ? visibleListings.filter((l) => l.shop?.isWomenLed || l.seller?.gender === 'female')
                : audienceFilter === 'cooperatives'
                ? visibleListings.filter((l) => l.shop?.isCooperative || l.seller?.gender === 'cooperative')
                : visibleListings
              ).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            {listings.length > 0 && (
              <Pagination
                page={listingPage}
                hasPrevious={listingPage > 0}
                hasNext={listings.length === 12}
                onPrevious={() => setListingPage((page) => Math.max(0, page - 1))}
                onNext={() => setListingPage((page) => page + 1)}
              />
            )}
          </>
        )}
      </div>

      <section className="space-y-4 border-t border-stone-200 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_services_badge')}</p>
            <h2 className="text-2xl font-semibold text-stone-900">{t('home_services_title')}</h2>
          </div>
          <Link href="/services" className="text-sm font-medium text-amber-700 hover:text-amber-800">{t('home_services_link')}</Link>
        </div>
        {visibleServices.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleServices.slice(0, 6).map((service) => {
              const isDemoService = service.id.startsWith('demo-');
              const imageUrl = service.fileUrls?.[0];
              const priceLabel = service.price ? formatXAF(service.price) : service.priceMin && service.priceMax ? `${formatXAF(service.priceMin)} - ${formatXAF(service.priceMax)}` : 'Sur devis';
              return (
                <article
                  key={service.id}
                  className={`relative flex flex-col overflow-hidden rounded-lg border bg-white ${isDemoService ? 'border-dashed border-stone-300' : 'border-stone-200'}`}
                >
                  {isDemoService ? <DemoBadge className="absolute right-3 top-3" /> : null}
                  <div className="relative aspect-[4/3] bg-stone-100">
                    {imageUrl ? <img src={resolveMediaUrl(imageUrl)} alt={service.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-medium text-stone-500">{categoryLabel(service.category)}</div>}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{categoryLabel(service.category)}</p>
                    <h3 className="mt-2 text-lg font-semibold text-stone-900">{service.title}</h3>
                    <p className="mt-2 line-clamp-3 text-sm text-stone-600">{service.description}</p>
                    <p className="mt-3 text-lg font-bold text-stone-950">{priceLabel}</p>
                    <p className="mt-3 text-sm text-stone-600">{t('service_estimated_days', { days: service.estimatedDays })}</p>
                    <p className="mt-2 text-sm text-stone-600">{service.averageRating ? `★ ${service.averageRating}/5` : t('service_no_rating')} <span className="text-stone-400">{t('service_reviews_count', { count: service.reviewCount ?? 0 })}</span></p>
                  </div>
                  <a href={isDemoService ? '/contact' : `/services/${service.id}`} className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-800">{t('home_service_view')}</a>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

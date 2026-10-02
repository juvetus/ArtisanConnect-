'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DemoBadge } from '@/components/DemoBadge';
import { ArtisanCard } from '@/components/ArtisanCard';
import { ListingCard } from '@/components/ListingCard';
import { Pagination } from '@/components/Pagination';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryGroups, categoryLabel } from '@/lib/categories';
import { demoArtisans, demoListings, demoServices } from '@/lib/demo-content';
import { DEMO_MODE, isDemoContent } from '@/lib/demo-mode';
import { useLanguage } from '@/lib/language-context';
import type { PublicArtisan, Service } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';

export default function HomePage() {
  const { t, language } = useLanguage();
  const english = language === 'en';
  const router = useRouter();
  const [filters, setFilters] = useState<{ q?: string; category?: string }>({});
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'women' | 'cooperatives'>('all');
  const [listingPage, setListingPage] = useState(0);
  const [draftQuery, setDraftQuery] = useState('');
  const [artisanQuery, setArtisanQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    ['listings', filters, audienceFilter, listingPage],
    ([, params, audience, page]) => api.listings({ ...params, audience: audience === 'all' ? undefined : audience, skip: page * 12, take: 12 }),
    // Sans cela, un retour sur l'onglet relancerait la requête et donc le défilement.
    { revalidateOnFocus: false },
  );

  const [listings, total] = data ?? [[], 0];
  const { data: services, isLoading: servicesLoading } = useSWR<Service[]>(
    'approved-services-home',
    async () => (await api.getApprovedServices(6)) as Service[],
  );
  const { data: artisans, isLoading: artisansLoading } = useSWR<PublicArtisan[]>(
    DEMO_MODE ? null : 'public-artisans-home',
    () => api.publicArtisans({ take: 6 }),
  );
  const hasFilter = Boolean(filters.q || filters.category || audienceFilter !== 'all');

  // Le défilement attend l'arrivée des résultats : tant que SWR n'a pas répondu, la page
  // a encore la hauteur de la liste précédente et la cible serait mal placée.
  useEffect(() => {
    if (!data || !hasFilter) return;
    resultsRef.current?.scrollIntoView({ block: 'start' });
  }, [data, hasFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (draftQuery.trim()) trackEvent('search', { label: draftQuery.trim() });
    setFilters(draftQuery ? { q: draftQuery } : {});
    setListingPage(0);
  };

  const selectCategory = (value: string) => {
    setDraftQuery('');
    setShowCategories(false);
    if (value) trackEvent('category_view', { label: categoryLabel(value) });
    setFilters(value ? { category: value } : {});
    setListingPage(0);
  };

  const toggleAudience = (audience: 'women' | 'cooperatives') => {
    setAudienceFilter((current) => current === audience ? 'all' : audience);
    setListingPage(0);
  };

  const activeCategory = CATEGORIES.find((c) => c.value === filters.category);
  const visibleListings = listings.length ? listings : DEMO_MODE && !hasFilter && !isLoading ? demoListings : [];
  const visibleTotal = listings.length ? total : visibleListings.length;
  const visibleServices = services?.length ? services : DEMO_MODE ? demoServices : [];
  const featuredProducts = visibleListings.filter((listing) => listing.type === 'product').slice(0, 6);
  const popularTrades = [
    { category: 'plomberie', icon: '🔧' },
    { category: 'electricite', icon: '⚡' },
    { category: 'menuiserie', icon: '🪚' },
    { category: 'froid', icon: '❄️' },
    { category: 'couture', icon: '👗' },
    { category: 'peinture', icon: '🎨' },
    { category: 'mecanique', icon: '🚗' },
  ];
  const trustSignals = [
    t('home_trust_profiles'),
    t('home_trust_quotes'),
    t('home_trust_reviews'),
    t('home_trust_whatsapp'),
    t('home_trust_followup'),
  ];
  const clientSteps = [t('home_journey_search'), t('home_journey_compare'), t('home_journey_order'), t('home_journey_follow')];

  const searchForArtisan = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = artisanQuery.trim();
    if (query) trackEvent('search', { label: query });
    router.push(`/trouver-un-artisan${query ? `?q=${encodeURIComponent(query)}` : ''}`);
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-xl bg-stone-900 text-white">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="px-6 py-10 lg:px-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{t('home_market_badge')}</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-4xl">{t('home_market_title')}</h1>
            <p className="mt-3 max-w-2xl text-stone-200">
              {t('home_market_subtitle')}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/trouver-un-artisan" className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700">{t('home_cta_find_artisan')}</Link>
              <Link href="/customer-requests" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100">{t('home_cta_quote')}</Link>
            </div>
            <p className="mt-4 text-sm text-stone-300">{t('home_hero_reassurance')}</p>
          </div>
          <div className="min-h-64 bg-[url('/images/african-market-artisan-stockcake.jpg')] bg-cover bg-center" aria-hidden />
        </div>
      </section>

      <section className="space-y-4 border-b border-stone-200 pb-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-900">{t('home_needs_title')}</h2>
        </div>
        <form onSubmit={searchForArtisan} className="flex max-w-3xl flex-col gap-2 sm:flex-row">
          <input value={artisanQuery} onChange={(event) => setArtisanQuery(event.target.value)} placeholder={t('home_needs_placeholder')} aria-label={t('home_needs_title')} className="min-h-12 flex-1 rounded-md border border-stone-300 bg-white px-4 py-3 text-base outline-none focus:border-amber-600" />
          <button type="submit" className="min-h-12 rounded-md bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">{t('home_needs_search')}</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {popularTrades.map((trade) => (
            <Link key={trade.category} href={`/trouver-un-artisan/${trade.category}`} className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm text-stone-700 transition hover:border-amber-600 hover:text-amber-900">
              <span aria-hidden>{trade.icon}</span>{categoryLabel(trade.category, language)}
            </Link>
          ))}
          <Link href="/services" className="inline-flex items-center px-2 py-2 text-sm font-medium text-amber-800 hover:underline">{t('home_all_services')} →</Link>
        </div>
      </section>

      <section aria-label={t('home_trust_heading')} className="grid gap-3 border-b border-stone-200 pb-6 sm:grid-cols-2 lg:grid-cols-5">
        <h2 className="text-lg font-semibold text-stone-900 sm:col-span-2 lg:col-span-5">{t('home_trust_heading')}</h2>
        {trustSignals.map((signal) => <p key={signal} className="flex items-center gap-2 text-sm font-medium text-stone-700"><span className="text-emerald-700" aria-hidden>✓</span>{signal}</p>)}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_featured_artisans_badge')}</p>
            <h2 className="mt-1 text-2xl font-semibold text-stone-900">{t('home_nearby_artisans')}</h2>
          </div>
          <Link href="/trouver-un-artisan" className="text-sm font-medium text-amber-800 hover:underline">{t('home_artisans_browse')} →</Link>
        </div>
        {DEMO_MODE ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {demoArtisans.map((artisan) => (
              <article key={artisan.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                <div className="relative"><Image src={artisan.imageUrl} alt={artisan.name} width={600} height={300} className="h-40 w-full object-cover" /><DemoBadge className="absolute right-2 top-2 shadow" /></div>
                <div className="p-4"><h3 className="font-semibold text-stone-900">{artisan.name}</h3><p className="mt-1 text-sm text-stone-600">{artisan.specialty} · {artisan.city}</p></div>
              </article>
            ))}
          </div>
        ) : artisansLoading ? (
          <p className="text-sm text-stone-600">{t('action_loading')}</p>
        ) : artisans?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{artisans.slice(0, 6).map((artisan) => <ArtisanCard key={artisan.id} artisan={artisan} />)}</div>
        ) : (
          <p className="border-y border-stone-200 py-5 text-sm text-stone-600">{t('home_artisans_empty')}</p>
        )}
      </section>

      <section id="produits-populaires" className="space-y-4 border-t border-stone-200 pt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_featured_products_badge')}</p>
            <h2 className="text-2xl font-semibold text-stone-900">{t('home_featured_products_title')}</h2>
          </div>
          <Link href="/annonces" className="text-sm font-medium text-amber-800 hover:underline">{t('home_view_catalog')}</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
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
              className="w-full rounded-lg border-2 border-transparent bg-white py-3 pl-12 pr-4 text-base text-stone-900 shadow-lg outline-none placeholder:text-stone-500 focus:border-amber-300"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white shadow-lg hover:bg-stone-800"
          >
            {t('search_button')}
          </button>
        </form>
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
            onClick={() => toggleAudience('women')}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              audienceFilter === 'women'
                ? 'border-rose-600 bg-rose-600 font-medium text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-rose-500 hover:text-rose-700'
            }`}
          >
            {t('filter_women')}
          </button>

          <button
            onClick={() => toggleAudience('cooperatives')}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm transition-colors ${
              audienceFilter === 'cooperatives'
                ? 'border-indigo-600 bg-indigo-600 font-medium text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-indigo-500 hover:text-indigo-700'
            }`}
          >
            {t('filter_coop')}
          </button>
        </div>

        {showCategories &&
          [
            { title: t('filter_crafts'), groups: categoryGroups(PRODUCT_CATEGORIES) },
            { title: t('filter_services'), groups: categoryGroups(SERVICE_CATEGORIES) },
          ].map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                {section.title}
              </p>
              <div className="space-y-3">
                {section.groups.map((group) => (
                  <div key={group.key}>
                    <p className="mb-1 text-xs font-medium text-stone-500">{english ? group.labelEn : group.labelFr}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.categories.map((category) => (
                        <button
                          key={category.value}
                          onClick={() => selectCategory(category.value)}
                          className={`rounded-full border px-4 py-1.5 text-sm ${filters.category === category.value ? 'border-amber-700 bg-amber-700 text-white' : 'border-stone-300 bg-white hover:border-amber-600'}`}
                        >
                          {categoryLabel(category.value, language)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

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
                {DEMO_MODE ? t('home_catalog_api_fallback') : t('home_catalog_api_unavailable')}
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
              {visibleListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            {listings.length > 0 && (
              <Pagination
                page={listingPage}
                hasPrevious={listingPage > 0}
                hasNext={(listingPage + 1) * 12 < total}
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
              const isDemo = isDemoContent(service.id, service.isDemo);
              return (
              <article key={service.id} className="flex flex-col rounded-lg border border-stone-200 bg-white p-5">
                {isDemo && <DemoBadge className="mb-3 self-start" />}
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{categoryLabel(service.category)}</p>
                  <h3 className="mt-2 text-lg font-semibold text-stone-900">{service.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-stone-600">{service.description}</p>
                  <p className="mt-3 text-sm text-stone-600">{t('service_estimated_days', { days: service.estimatedDays })}</p>
                  <p className="mt-2 text-sm text-stone-600">{service.averageRating ? `★ ${service.averageRating}/5` : t('service_no_rating')} <span className="text-stone-400">{t('service_reviews_count', { count: service.reviewCount ?? 0 })}</span></p>
                </div>
                {!isDemo ? <a href={`/services/${service.id}`} className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-800">{t('home_service_view')}</a> : null}
              </article>
              );
            })}
          </div>
        )}
        {!visibleServices.length && !servicesLoading ? <p className="rounded-md border border-stone-200 bg-white p-6 text-sm text-stone-600">{t('home_services_empty')}</p> : null}
      </section>

      <section className="space-y-4 border-t border-stone-200 pt-8">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('how_badge')}</p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-900">{t('home_journey_title')}</h2>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {clientSteps.map((step, index) => <li key={step} className="flex items-center gap-3 border-l-2 border-amber-500 py-2 pl-3"><span className="text-sm font-bold text-amber-800">{index + 1}</span><span className="font-medium text-stone-800">{step}</span></li>)}
        </ol>
        <Link href="/how-it-works" className="inline-block text-sm font-medium text-amber-800 hover:underline">{t('nav_how_it_works')} →</Link>
      </section>

      <section className="flex flex-col gap-4 border-t border-stone-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('nav_for_artisans')}</p>
          <h2 className="mt-1 text-2xl font-semibold text-stone-900">{t('home_artisan_cta_title')}</h2>
          <p className="mt-2 text-sm text-stone-600">{t('home_artisan_cta_desc')}</p>
        </div>
        <Link href="/register?role=artisan" className="inline-flex min-h-12 items-center justify-center rounded-md bg-amber-700 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-800">{t('home_artisan_cta_button')}</Link>
      </section>
    </div>
  );
}

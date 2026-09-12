'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { Pagination } from '@/components/Pagination';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/language-context';
import type { Service } from '@/lib/types';

export default function HomePage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<{ q?: string; category?: string }>({});
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'women' | 'cooperatives'>('all');
  const [listingPage, setListingPage] = useState(0);
  const [draftQuery, setDraftQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    ['listings', filters, listingPage],
    ([, params, page]) => api.listings({ ...params, skip: page * 12, take: 12 }),
    // Sans cela, un retour sur l'onglet relancerait la requête et donc le défilement.
    { revalidateOnFocus: false },
  );

  const [listings, total] = data ?? [[], 0];
  const { data: services } = useSWR<Service[]>(
    'approved-services-home',
    async () => (await api.getApprovedServices(6)) as Service[],
  );
  const hasFilter = Boolean(filters.q || filters.category);

  // Le défilement attend l'arrivée des résultats : tant que SWR n'a pas répondu, la page
  // a encore la hauteur de la liste précédente et la cible serait mal placée.
  useEffect(() => {
    if (!data || !hasFilter) return;
    resultsRef.current?.scrollIntoView({ block: 'start' });
  }, [data, hasFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draftQuery ? { q: draftQuery } : {});
    setListingPage(0);
  };

  const selectCategory = (value: string) => {
    setDraftQuery('');
    setShowCategories(false);
    setFilters(value ? { category: value } : {});
    setListingPage(0);
  };

  const activeCategory = CATEGORIES.find((c) => c.value === filters.category);

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-amber-800 px-6 py-10 text-white">
        <h1 className="text-3xl font-semibold">{t('hero_title')}</h1>
        <p className="mt-2 max-w-2xl text-amber-100">
          {t('hero_subtitle')}
        </p>

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

      <div className="space-y-5">
        {isLoading ? (
          <p className="text-stone-600">{t('action_loading')}</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            Impossible de charger le catalogue. Le serveur est-il démarré ?
          </p>
        ) : listings.length === 0 ? (
          <p className="rounded-md border border-stone-200 bg-white p-8 text-center text-stone-600">
            Aucune annonce ne correspond à votre recherche.
          </p>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              {t('announcements_count', { count: total })}
              {filters.q && ` pour « ${filters.q} »`}
              {audienceFilter === 'women' && ` · ${t('filter_women_active')}`}
              {audienceFilter === 'cooperatives' && ` · ${t('filter_coop_active')}`}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(audienceFilter === 'women'
                ? listings.filter((l) => l.shop?.isWomenLed || l.seller?.gender === 'female')
                : audienceFilter === 'cooperatives'
                ? listings.filter((l) => l.shop?.isCooperative || l.seller?.gender === 'cooperative')
                : listings
              ).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            <Pagination
              page={listingPage}
              hasPrevious={listingPage > 0}
              hasNext={listings.length === 12}
              onPrevious={() => setListingPage((page) => Math.max(0, page - 1))}
              onNext={() => setListingPage((page) => page + 1)}
            />
          </>
        )}
      </div>

      <section className="space-y-4 border-t border-stone-200 pt-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_services_badge')}</p>
            <h2 className="text-2xl font-semibold text-stone-900">{t('home_services_title')}</h2>
          </div>
          <a href="/services" className="text-sm font-medium text-amber-700 hover:text-amber-800">{t('home_services_link')}</a>
        </div>
        {!services?.length ? (
          <p className="rounded-md border border-stone-200 bg-stone-50 p-5 text-sm text-stone-600">{t('home_services_empty')}</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <article key={service.id} className="flex flex-col rounded-lg border border-stone-200 bg-white p-5">
                <div className="flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{categoryLabel(service.category)}</p>
                  <h3 className="mt-2 text-lg font-semibold text-stone-900">{service.title}</h3>
                  <p className="mt-2 line-clamp-3 text-sm text-stone-600">{service.description}</p>
                  <p className="mt-3 text-sm text-stone-600">{t('service_estimated_days', { days: service.estimatedDays })}</p>
                  <p className="mt-2 text-sm text-stone-600">{service.averageRating ? `★ ${service.averageRating}/5` : t('service_no_rating')} <span className="text-stone-400">{t('service_reviews_count', { count: service.reviewCount ?? 0 })}</span></p>
                </div>
                <a href={`/services/${service.id}`} className="mt-4 rounded-md bg-amber-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-800">{t('home_service_view')}</a>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

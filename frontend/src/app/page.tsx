'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { DemoBadge } from '@/components/DemoBadge';
import { ListingCard } from '@/components/ListingCard';
import { Pagination } from '@/components/Pagination';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryGroups, categoryLabel } from '@/lib/categories';
import { demoArtisans, demoListings, demoServices } from '@/lib/demo-content';
import { DEMO_MODE, isDemoContent } from '@/lib/demo-mode';
import { useLanguage } from '@/lib/language-context';
import type { Service } from '@/lib/types';
import { trackEvent } from '@/lib/analytics';

export default function HomePage() {
  const { t, language } = useLanguage();
  const english = language === 'en';
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
  const { data: services, isLoading: servicesLoading } = useSWR<Service[]>(
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

  const activeCategory = CATEGORIES.find((c) => c.value === filters.category);
  const visibleListings = listings.length ? listings : DEMO_MODE && !hasFilter && !isLoading ? demoListings : [];
  const visibleTotal = listings.length ? total : visibleListings.length;
  const visibleServices = services?.length ? services : DEMO_MODE ? demoServices : [];
  const featuredProducts = visibleListings.slice(0, 6);

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
              <a href="#produits-populaires" className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700">{t('home_cta_products')}</a>
              <Link href="/services" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100">{t('home_cta_service')}</Link>
              <a href="/how-it-works" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{t('home_cta_how')}</a>
            </div>
          </div>
          <div className="min-h-64 bg-[url('/images/african-market-artisan-stockcake.jpg')] bg-cover bg-center" aria-hidden />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t('home_category_products_title'), t('home_category_products_desc'), 'vannerie'],
          [t('home_category_services_title'), t('home_category_services_desc'), 'couture'],
          [t('home_category_women_title'), t('home_category_women_desc'), 'mode'],
          [t('home_category_coops_title'), t('home_category_coops_desc'), 'ameublement'],
        ].map(([title, description, category]) => (
          <button
            key={title}
            onClick={() => selectCategory(category)}
            className="rounded-lg border border-stone-200 bg-white p-4 text-left transition hover:border-amber-600 hover:shadow-sm"
          >
            <p className="font-semibold text-stone-900">{title}</p>
            <p className="mt-1 text-sm text-stone-600">{description}</p>
          </button>
        ))}
      </section>

      <section className="grid gap-4 overflow-hidden rounded-xl border border-stone-200 bg-white p-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid grid-cols-2 gap-3">
          <Image src="/images/african-marketplace-artisan-stockcake.jpg" alt="Stand artisanal coloré avec vannerie et décorations" width={1200} height={800} className="col-span-2 h-60 w-full rounded-lg object-cover" />
          <Image src="/images/african-market-artisan-stockcake.jpg" alt="Marché artisanal camerounais avec textiles et poteries" width={800} height={600} className="h-36 w-full rounded-lg object-cover" />
          <Image src="/images/infusing-personal-style-into-your-craft-market-stall.jpg" alt="Stand de créations artisanales avec textiles et objets décoratifs" width={800} height={600} className="h-36 w-full rounded-lg object-cover" />
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
          <a href="#catalogue" className="text-sm font-medium text-amber-700 hover:text-amber-800">{t('home_view_catalog')}</a>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featuredProducts.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {DEMO_MODE ? <section className="grid gap-5 rounded-xl border border-stone-200 bg-white p-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('home_featured_artisans_badge')}</p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">{t('home_featured_artisans_title')}</h2>
          <p className="mt-2 text-sm text-stone-600">{t('home_featured_artisans_desc')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {demoArtisans.map((artisan) => (
            <article key={artisan.id} className="overflow-hidden rounded-lg border border-stone-200 bg-stone-50">
              <div className="relative">
                <Image src={artisan.imageUrl} alt={artisan.name} width={600} height={300} className="h-28 w-full object-cover" />
                <DemoBadge className="absolute right-2 top-2 shadow" />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-stone-900">{artisan.name}</h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700">{artisan.specialty}</p>
                <p className="mt-1 text-sm text-stone-600">{artisan.city}</p>
              </div>
            </article>
          ))}
        </div>
      </section> : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [t('home_trust_verified_title'), t('home_trust_verified_desc')],
          [t('home_trust_payment_title'), t(DEMO_MODE ? 'home_trust_payment_demo_desc' : 'home_trust_payment_desc')],
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
    </div>
  );
}

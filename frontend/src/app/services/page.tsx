'use client';

import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import type { Service } from '@/lib/types';
import { Pagination } from '@/components/Pagination';
import { categoryLabel } from '@/lib/categories';

export default function ServicesCatalogPage() {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'women' | 'cooperatives'>('all');
  const pageSize = 12;
  const { data: services, isLoading } = useSWR<Service[]>(['approved-services', page], async ([, currentPage]) => (await api.getApprovedServices(pageSize, Number(currentPage) * pageSize)) as Service[]);

  const displayedServices = audienceFilter === 'women'
    ? services?.filter((s) => s.artisan?.gender === 'female')
    : audienceFilter === 'cooperatives'
    ? services?.filter((s) => s.artisan?.gender === 'cooperative')
    : services;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="grid overflow-hidden rounded-xl bg-stone-900 text-white lg:grid-cols-[0.9fr_1.1fr]">
        <div className="flex flex-col justify-center px-6 py-8 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">Services artisanaux au Cameroun</p>
          <h1 className="mt-2 text-3xl font-semibold">Trouvez l’artisan adapté à votre projet</h1>
          <p className="mt-3 text-sm leading-6 text-stone-200">Découvrez des professionnels pour vos projets du quotidien : création, réparation, aménagement, entretien et prestations sur mesure partout au Cameroun.</p>
        </div>
          <div className="relative flex min-h-64 items-center justify-center overflow-hidden bg-stone-950 p-2">
          <div className="relative w-full max-w-[42rem]">
            <Image src="/images/couture-1.png" alt="Créatrice camerounaise réalisant une couture sur mesure" width={1536} height={1024} className="block max-h-80 w-full object-contain" />
            <span aria-hidden className="pointer-events-none absolute right-[1%] top-[1%] h-[8%] w-[17%] rounded-full bg-stone-900/95" />
          </div>
        </div>
      </section>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
          <h2 className="mt-1 text-3xl font-semibold text-stone-900">{t('services_page_title')}</h2>
          <p className="mt-2 text-stone-600">{t('services_page_subtitle')}</p>
        </div>
        <a href="/customer-requests" className="rounded-lg bg-amber-700 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-800">Je cherche un artisan</a>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAudienceFilter((prev) => (prev === 'women' ? 'all' : 'women'))}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
              audienceFilter === 'women'
                ? 'border-rose-600 bg-rose-600 font-medium text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-rose-500 hover:text-rose-700'
            }`}
          >
            {t('filter_women')}
          </button>
          <button
            onClick={() => setAudienceFilter((prev) => (prev === 'cooperatives' ? 'all' : 'cooperatives'))}
            className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
              audienceFilter === 'cooperatives'
                ? 'border-indigo-600 bg-indigo-600 font-medium text-white shadow-sm'
                : 'border-stone-300 bg-white text-stone-700 hover:border-indigo-500 hover:text-indigo-700'
            }`}
          >
            {t('filter_coop')}
          </button>
        </div>
      </header>

      {isLoading ? <p className="text-stone-600">{t('action_loading')}</p> : null}
      {!isLoading && !displayedServices?.length ? <p className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-600">{t('services_empty')}</p> : null}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {displayedServices?.map((service) => {
          const isWoman = service.artisan?.gender === 'female';
          const isCoop = service.artisan?.gender === 'cooperative';
          return (
            <article key={service.id} className="relative flex flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-xs">
              {isWoman && (
                <span className="mb-2 inline-block self-start rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                  {t('badge_women_empowerment')}
                </span>
              )}
              {isCoop && (
                <span className="mb-2 inline-block self-start rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                  {t('badge_coop')}
                </span>
              )}
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{categoryLabel(service.category)}</p>
                <h2 className="mt-2 text-xl font-semibold text-stone-900">{service.title}</h2>
                <p className="mt-3 line-clamp-4 text-sm text-stone-600">{service.description}</p>
                <p className="mt-4 text-sm text-stone-600">{t('service_estimated_days', { days: service.estimatedDays })}</p>
                <p className="mt-2 text-sm text-stone-600">{service.averageRating ? `★ ${service.averageRating}/5` : t('service_no_rating')} <span className="text-stone-400">{t('service_reviews_count', { count: service.reviewCount ?? 0 })}</span></p>
              </div>
              <Link href={`/services/${service.id}`} className="mt-5 rounded-md bg-amber-700 px-4 py-2 text-center text-sm font-medium text-white hover:bg-amber-800">{t('action_see_and_order')}</Link>
            </article>
          );
        })}
      </div>
      {services?.length ? <Pagination page={page} hasPrevious={page > 0} hasNext={services.length === pageSize} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} /> : null}
    </div>
  );
}

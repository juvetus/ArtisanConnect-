'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

const benefitIcons = ['◇', '✓', '→'];

export default function ClientsPage() {
  const { t } = useLanguage();
  const benefits = [
    ['clients_benefit_discover_title', 'clients_benefit_discover_desc'],
    ['clients_benefit_compare_title', 'clients_benefit_compare_desc'],
    ['clients_benefit_order_title', 'clients_benefit_order_desc'],
  ] as const;
  const steps = ['clients_step_1', 'clients_step_2', 'clients_step_3', 'clients_step_4'] as const;

  return (
    <div className="mx-auto max-w-6xl space-y-10">
      <section className="overflow-hidden rounded-xl bg-stone-900 text-white">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="px-6 py-12 lg:px-10 lg:py-16">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{t('clients_badge')}</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight md:text-5xl">{t('clients_title')}</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-stone-200">{t('clients_subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/" className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700">{t('clients_browse')}</Link>
              <Link href="/register" className="rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10">{t('clients_register')}</Link>
            </div>
          </div>
          <div className="min-h-72 bg-[url('/images/african-marketplace-artisan-stockcake.jpg')] bg-cover bg-center" role="img" aria-label="Produits artisanaux camerounais sur un marché" />
        </div>
      </section>
      <p className="mx-auto max-w-3xl text-center text-lg font-medium leading-8 text-stone-700">{t('clients_proof')}</p>
      <section className="space-y-5">
        <div><p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p><h2 className="mt-1 text-3xl font-semibold text-stone-900">{t('clients_benefits_title')}</h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          {benefits.map(([titleKey, descriptionKey], index) => <article key={titleKey} className="rounded-lg border border-stone-200 bg-white p-6"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-xl text-amber-800" aria-hidden>{benefitIcons[index]}</span><h3 className="mt-5 text-lg font-semibold text-stone-900">{t(titleKey)}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{t(descriptionKey)}</p></article>)}
        </div>
      </section>
      <section className="grid gap-8 rounded-xl border border-stone-200 bg-white p-6 lg:grid-cols-[0.85fr_1.15fr] lg:p-8">
        <div><p className="text-sm font-medium uppercase tracking-wide text-amber-700">4 étapes</p><h2 className="mt-2 text-2xl font-semibold text-stone-900">{t('clients_how_title')}</h2></div>
        <ol className="grid gap-4 sm:grid-cols-2">{steps.map((stepKey, index) => <li key={stepKey} className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-900 text-sm font-bold text-white">{index + 1}</span><span className="pt-1 text-sm font-medium leading-6 text-stone-700">{t(stepKey)}</span></li>)}</ol>
      </section>
      <section className="grid gap-6 rounded-xl bg-amber-50 p-6 lg:grid-cols-[1fr_auto] lg:items-center lg:p-8"><div><h2 className="text-2xl font-semibold text-stone-900">{t('clients_audience_title')}</h2><p className="mt-2 max-w-3xl leading-7 text-stone-700">{t('clients_audience_desc')}</p></div><Link href="/" className="rounded-lg bg-stone-900 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-stone-800">{t('clients_browse')}</Link></section>
      <section className="rounded-xl border border-stone-200 bg-white p-6 text-center lg:p-10"><h2 className="text-2xl font-semibold text-stone-900">{t('clients_final_title')}</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-stone-600">{t('clients_final_desc')}</p><Link href="/" className="mt-6 inline-block rounded-lg bg-amber-700 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-800">{t('clients_browse')}</Link></section>
    </div>
  );
}
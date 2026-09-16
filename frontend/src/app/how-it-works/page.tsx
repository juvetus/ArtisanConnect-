'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

export default function HowItWorksPage() {
  const { t } = useLanguage();
  const clientSteps = [
    [t('how_client_step_1_title'), t('how_client_step_1_desc')],
    [t('how_client_step_2_title'), t('how_client_step_2_desc')],
    [t('how_client_step_3_title'), t('how_client_step_3_desc')],
    [t('how_client_step_4_title'), t('how_client_step_4_desc')],
  ];
  const artisanSteps = [
    [t('how_artisan_step_1_title'), t('how_artisan_step_1_desc')],
    [t('how_artisan_step_2_title'), t('how_artisan_step_2_desc')],
    [t('how_artisan_step_3_title'), t('how_artisan_step_3_desc')],
    [t('how_artisan_step_4_title'), t('how_artisan_step_4_desc')],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <section className="rounded-xl bg-stone-900 px-6 py-10 text-white">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{t('how_badge')}</p>
        <h1 className="mt-3 text-3xl font-semibold md:text-4xl">{t('how_title')}</h1>
        <p className="mt-3 max-w-3xl text-stone-200">
          {t('how_subtitle')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/" className="rounded-lg bg-amber-600 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-700">{t('how_explore_marketplace')}</Link>
          <Link href="/register" className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-stone-900 hover:bg-stone-100">{t('how_create_account')}</Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-stone-900">{t('how_clients_title')}</h2>
          <div className="mt-5 space-y-4">
            {clientSteps.map(([title, description], index) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-2xl font-semibold text-stone-900">{t('how_artisans_title')}</h2>
          <div className="mt-5 space-y-4">
            {artisanSteps.map(([title, description], index) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-800">{index + 1}</span>
                <div>
                  <h3 className="font-semibold text-stone-900">{title}</h3>
                  <p className="mt-1 text-sm text-stone-600">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">{t('how_payments_title')}</h2>
          <p className="mt-2 text-sm text-stone-600">{t('how_payments_desc')}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">{t('how_delivery_title')}</h2>
          <p className="mt-2 text-sm text-stone-600">{t('how_delivery_desc')}</p>
        </div>
        <div className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="font-semibold text-stone-900">{t('how_trust_title')}</h2>
          <p className="mt-2 text-sm text-stone-600">{t('how_trust_desc')}</p>
        </div>
      </section>

      <section className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-xl font-semibold text-stone-900">{t('how_help_title')}</h2>
        <p className="mt-2 text-sm text-stone-700">{t('how_help_desc')}</p>
        <Link href="/contact" className="mt-4 inline-block rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">{t('how_contact_us')}</Link>
      </section>
    </div>
  );
}

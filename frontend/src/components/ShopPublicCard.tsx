'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useLanguage } from '@/lib/language-context';
import type { VerificationLevel, VerificationState } from '@/lib/types';

export function ShopPublicCard({
  shopId,
  shopName,
  description,
  shopType,
  averageRating,
  ratingCount,
  verificationLevel,
  verificationState,
  shopWhatsapp,
  shareShopWhatsapp,
  qrCodeUrl,
  city,
  quoteHref,
}: {
  shopId: string;
  shopName: string;
  description: string;
  shopType: string;
  averageRating: number | null;
  ratingCount: number;
  verificationLevel: VerificationLevel;
  verificationState?: VerificationState;
  shopWhatsapp: string | null;
  shareShopWhatsapp: string;
  qrCodeUrl: string;
  city?: string | null;
  quoteHref: string;
}) {
  const { t } = useLanguage();
  const [metrics, setMetrics] = useState({ views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 });
  const verificationSteps = [
    { label: 'verification_step_phone', description: 'verification_step_phone_desc', done: verificationState?.steps.phone ?? false },
    { label: 'verification_step_profile', description: 'verification_step_profile_desc', done: verificationState?.steps.profile ?? false },
    { label: 'verification_step_identity', description: 'verification_step_identity_desc', done: verificationState?.steps.identity ?? false },
    { label: 'verification_step_recommended', description: 'verification_step_recommended_desc', done: verificationState?.steps.recommended ?? false },
  ] as const;

  useEffect(() => {
    trackEvent('artisan_profile_view', { targetId: shopId, label: shopName, city: city ?? undefined });

    void api.shopMetrics(shopId)
      .then((data) => setMetrics(data))
      .catch(() => setMetrics({ views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 }));

    void api.incrementShopMetric(shopId, 'views', 1)
      .then((data) => setMetrics(data))
      .catch(() => undefined);
  }, [shopId, shopName, city]);

  return (
    <section className="mb-8 rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-2xl font-bold">{shopName}</h1>
      <div className="mt-2 text-stone-700">{description}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
        <span>Boutique {shopType}</span>
        <span>{averageRating ? `★ ${averageRating}/5` : 'Pas encore noté'} ({ratingCount} avis)</span>
        <VerificationBadge level={verificationLevel} />
      </div>
      <details className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
        <summary className="cursor-pointer text-sm font-medium text-stone-800">{t('verification_explainer_title')}</summary>
        <ul className="mt-3 space-y-3 text-sm">
          {verificationSteps.map((step) => (
            <li key={step.label} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3">
              <div>
                <p className="font-medium text-stone-900">{t(step.label)}</p>
                <p className="mt-0.5 leading-5 text-stone-600">{t(step.description)}</p>
              </div>
              <span className={`text-xs font-medium ${step.done ? 'text-emerald-800' : 'text-stone-500'}`}>
                {step.done ? t('verification_step_done') : t('verification_step_pending')}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-stone-200 pt-3 text-xs leading-5 text-stone-600">{t('verification_disclaimer')}</p>
      </details>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={quoteHref}
          className="rounded-md bg-amber-700 px-5 py-3 text-base font-semibold text-white hover:bg-amber-800"
        >
          Demander un devis
        </Link>
        {shopWhatsapp ? (
          <a
            href={shopWhatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              trackEvent('whatsapp_click', { targetId: shopId, label: shopName, city: city ?? undefined });
              void api.incrementShopMetric(shopId, 'whatsappContactClicks', 1)
                .then((data) => setMetrics(data))
                .catch(() => undefined);
            }}
            className="rounded-md border border-green-600 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-50"
          >
            Contacter sur WhatsApp
          </a>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-md bg-stone-100 p-3 text-center">
          <div className="text-xs uppercase tracking-wide text-stone-500">Vues</div>
          <div className="mt-1 text-lg font-semibold text-stone-900">{metrics.views}</div>
        </div>
        <div className="rounded-md bg-stone-100 p-3 text-center">
          <div className="text-xs uppercase tracking-wide text-stone-500">WhatsApp</div>
          <div className="mt-1 text-lg font-semibold text-stone-900">{metrics.whatsappContactClicks}</div>
        </div>
        <div className="rounded-md bg-stone-100 p-3 text-center">
          <div className="text-xs uppercase tracking-wide text-stone-500">Partages</div>
          <div className="mt-1 text-lg font-semibold text-stone-900">{metrics.whatsappShareClicks}</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={shareShopWhatsapp}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            void api.incrementShopMetric(shopId, 'whatsappShareClicks', 1)
              .then((data) => setMetrics(data))
              .catch(() => undefined);
          }}
          className="rounded-md border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
        >
          Partager la boutique
        </a>
        <a href={qrCodeUrl} target="_blank" rel="noreferrer" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
          QR code
        </a>
      </div>
    </section>
  );
}

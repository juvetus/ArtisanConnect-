'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { VerificationBadge } from '@/components/VerificationBadge';
import { useLanguage } from '@/lib/language-context';
import { categoryLabel } from '@/lib/categories';
import { resolveMediaUrl } from '@/lib/media';
import type { VerificationLevel, VerificationState } from '@/lib/types';

export function ShopPublicCard({
  shopId,
  shopName,
  profileImageUrl,
  category,
  location,
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
  profileImageUrl?: string | null;
  category?: string | null;
  location: string;
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
  const trackWhatsappContact = () => {
    trackEvent('whatsapp_click', { targetId: shopId, label: shopName, city: city ?? undefined });
    void api.incrementShopMetric(shopId, 'whatsappContactClicks', 1).then(setMetrics).catch(() => undefined);
  };
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
    <section className="mb-6 rounded-lg border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4 sm:gap-5">
        {profileImageUrl ? (
          <Image src={resolveMediaUrl(profileImageUrl)} alt={shopName} width={96} height={96} unoptimized className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-amber-100 text-3xl font-semibold text-amber-900 sm:h-24 sm:w-24" aria-hidden>
            {shopName.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold text-stone-900">{shopName}</h1>
          {category ? <p className="mt-1 font-medium text-amber-800">{categoryLabel(category)}</p> : null}
          <p className="mt-1 text-sm text-stone-600"><span aria-hidden>📍 </span>{location || 'Zone à préciser'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-stone-700">
            {averageRating !== null && ratingCount > 0 ? (
              <span className="font-semibold text-stone-900">★ {averageRating}/5 <span className="font-normal text-stone-600">({ratingCount} avis)</span></span>
            ) : (
              <span className="font-medium text-stone-600">★ Nouveau · Pas encore d’avis</span>
            )}
            <VerificationBadge level={verificationLevel} />
          </div>
        </div>
      </div>
      <div className="mt-5 hidden flex-wrap items-center gap-3 sm:flex">
        <Link href={quoteHref} className="rounded-md bg-amber-700 px-5 py-3 text-base font-semibold text-white hover:bg-amber-800">
          Demander un devis
        </Link>
        {shopWhatsapp ? (
          <a href={shopWhatsapp} target="_blank" rel="noreferrer" onClick={trackWhatsappContact} className="rounded-md border border-green-700 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-50">
            Contacter sur WhatsApp
          </a>
        ) : null}
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
        <p className="mt-2 text-xs leading-5 text-stone-600">{t('premium_quality_distinction')}</p>
      </details>
      <details className="mt-3 border-t border-stone-100 pt-3">
        <summary className="cursor-pointer text-sm font-medium text-stone-700">Partager le profil et voir son activité</summary>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded-md bg-stone-100 p-3 text-center"><div className="text-xs uppercase text-stone-500">Vues</div><div className="mt-1 font-semibold text-stone-900">{metrics.views}</div></div>
          <div className="rounded-md bg-stone-100 p-3 text-center"><div className="text-xs uppercase text-stone-500">WhatsApp</div><div className="mt-1 font-semibold text-stone-900">{metrics.whatsappContactClicks}</div></div>
          <div className="rounded-md bg-stone-100 p-3 text-center"><div className="text-xs uppercase text-stone-500">Partages</div><div className="mt-1 font-semibold text-stone-900">{metrics.whatsappShareClicks}</div></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={shareShopWhatsapp} target="_blank" rel="noreferrer" onClick={() => {
            void api.incrementShopMetric(shopId, 'whatsappShareClicks', 1).then(setMetrics).catch(() => undefined);
          }} className="rounded-md border border-green-700 px-3 py-1.5 text-sm font-medium text-green-800 hover:bg-green-50">
            Partager la boutique
          </a>
          <a href={qrCodeUrl} target="_blank" rel="noreferrer" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50">QR code</a>
        </div>
      </details>
      <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-stone-200 bg-white/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden" role="group" aria-label={t('home_artisan_quote')}>
        <Link href={quoteHref} className="flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-md bg-amber-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-amber-800">
          {t('home_artisan_quote')}
        </Link>
        {shopWhatsapp ? (
          <a href={shopWhatsapp} target="_blank" rel="noreferrer" onClick={trackWhatsappContact} className="flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-md border border-green-700 px-3 py-2 text-center text-sm font-semibold text-green-800 hover:bg-green-50">
            WhatsApp
          </a>
        ) : null}
      </div>
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { VerificationBadge } from '@/components/VerificationBadge';
import type { VerificationLevel } from '@/lib/types';

export function ShopPublicCard({
  shopId,
  shopName,
  description,
  shopType,
  averageRating,
  ratingCount,
  verificationLevel,
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
  shopWhatsapp: string | null;
  shareShopWhatsapp: string;
  qrCodeUrl: string;
  city?: string | null;
  quoteHref: string;
}) {
  const [metrics, setMetrics] = useState({ views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 });

  useEffect(() => {
    trackEvent('artisan_profile_view', { targetId: shopId, label: shopName, city: city ?? undefined });

    void api.shopMetrics(shopId)
      .then((data) => setMetrics(data))
      .catch(() => setMetrics({ views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 }));

    void api.incrementShopMetric(shopId, 'views', 1)
      .then((data) => setMetrics(data))
      .catch(() => undefined);
  }, [shopId]);

  return (
    <section className="mb-8 rounded-lg border border-stone-200 bg-white p-6">
      <h1 className="text-2xl font-bold">{shopName}</h1>
      <div className="mt-2 text-stone-700">{description}</div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
        <span>Boutique {shopType}</span>
        <span>{averageRating ? `★ ${averageRating}/5` : 'Pas encore noté'} ({ratingCount} avis)</span>
        <VerificationBadge level={verificationLevel} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={quoteHref}
          onClick={() => trackEvent('quote_form_opened', { targetId: shopId, label: shopName, city: city ?? undefined })}
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

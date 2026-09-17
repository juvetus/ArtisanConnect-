'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export function ShopPublicCard({
  shopId,
  shopName,
  description,
  shopType,
  averageRating,
  ratingCount,
  verifiedBadge,
  shopWhatsapp,
  shareShopWhatsapp,
  qrCodeUrl,
}: {
  shopId: string;
  shopName: string;
  description: string;
  shopType: string;
  averageRating: number | null;
  ratingCount: number;
  verifiedBadge: boolean;
  shopWhatsapp: string | null;
  shareShopWhatsapp: string;
  qrCodeUrl: string;
}) {
  const [metrics, setMetrics] = useState({ views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 });

  useEffect(() => {
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
      <div className="mt-4 text-sm text-stone-600">
        <span>Boutique {shopType}</span>
        <span className="ml-3">{averageRating ? `★ ${averageRating}/5` : 'Pas encore noté'} ({ratingCount} avis)</span>
        {verifiedBadge && <span className="ml-2 text-emerald-600">✔ Vendeur vérifié</span>}
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
        {shopWhatsapp ? (
          <a
            href={shopWhatsapp}
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              void api.incrementShopMetric(shopId, 'whatsappContactClicks', 1)
                .then((data) => setMetrics(data))
                .catch(() => undefined);
            }}
            className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
          >
            Contacter la boutique sur WhatsApp
          </a>
        ) : null}
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

'use client';

import Link from 'next/link';
import { categoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/language-context';
import { resolveMediaUrl } from '@/lib/media';
import { VerificationBadge } from '@/components/VerificationBadge';
import type { PublicArtisan } from '@/lib/types';

export function ArtisanCard({ artisan }: { artisan: PublicArtisan }) {
  const { t } = useLanguage();

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-stone-200 bg-white">
      {artisan.coverImageUrl ? (
        <img src={resolveMediaUrl(artisan.coverImageUrl)} alt={artisan.name} className="h-36 w-full shrink-0 object-cover" />
      ) : (
        <div className="flex h-36 w-full shrink-0 items-center justify-center bg-stone-100 text-3xl" aria-hidden>🛠️</div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 font-semibold text-stone-900">{artisan.name}</h3>
        {artisan.category ? (
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-amber-700">{categoryLabel(artisan.category)}</p>
        ) : null}
        <p className="mt-1 text-sm text-stone-600">
          {[artisan.neighborhood, artisan.city].filter(Boolean).join(', ') || '—'}
        </p>
        <p className="mt-2 text-sm text-stone-700">
          {artisan.rating.average
            ? `★ ${artisan.rating.average}/5 ${t('service_reviews_count', { count: artisan.rating.count })}`
            : t('home_artisan_no_rating')}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
          <VerificationBadge level={artisan.verification.level} />
          {artisan.isWomenLed ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">{t('badge_women')}</span> : null}
          {artisan.isCooperative ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">{t('badge_coop')}</span> : null}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link href={`/shop/${artisan.id}`} className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800">
            {t('home_artisan_view')}
          </Link>
          <Link href="/customer-requests" className="rounded-md border border-amber-700 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50">
            {t('home_artisan_quote')}
          </Link>
        </div>
      </div>
    </article>
  );
}

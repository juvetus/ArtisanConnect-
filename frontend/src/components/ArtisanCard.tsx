'use client';

import Link from 'next/link';
import Image from 'next/image';
import { categoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { resolveMediaUrl } from '@/lib/media';
import type { PublicArtisan } from '@/lib/types';
import { whatsappHref } from '@/lib/whatsapp';
import { formatXAF } from '@/lib/format';

export function ArtisanCard({ artisan }: { artisan: PublicArtisan }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = [artisan.neighborhood, artisan.city].filter(Boolean).join(', ');
  const quoteParams = new URLSearchParams();
  if (artisan.category) quoteParams.set('category', artisan.category);
  if (artisan.city) quoteParams.set('city', artisan.city);
  if (artisan.neighborhood) quoteParams.set('neighborhood', artisan.neighborhood);
  const quoteHref = `/customer-requests${quoteParams.size ? `?${quoteParams}` : ''}`;
  const institutionalWhatsApp = user?.role === 'institution'
    ? whatsappHref(artisan.whatsappPhone, `Bonjour ${artisan.name}, nous vous contactons via ArtisanConnect au sujet d’un possible partenariat avec votre activité artisanale.`)
    : null;
  const responseTime = artisan.averageResponseMinutes === null || artisan.averageResponseMinutes === undefined
    ? t('artisan_card_response_unknown')
    : artisan.averageResponseMinutes < 60
      ? t('artisan_card_response_under_hour')
      : t('artisan_card_response_hours', { hours: Math.round(artisan.averageResponseMinutes / 60) });
  const availability = artisan.availability ?? 'unavailable';
  const availabilityClassName = availability === 'available'
    ? 'bg-emerald-50 text-emerald-800'
    : availability === 'busy'
      ? 'bg-amber-50 text-amber-800'
      : 'bg-stone-100 text-stone-600';

  return (
    <article className="flex h-full flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {artisan.coverImageUrl ? (
          <Image src={resolveMediaUrl(artisan.coverImageUrl)} alt="" width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-semibold text-amber-800" aria-hidden>
            {artisan.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-semibold text-stone-900">{artisan.name}</h3>
          {artisan.category ? <p className="mt-0.5 text-sm font-medium text-amber-700">{categoryLabel(artisan.category)}</p> : null}
          {location ? <p className="mt-1 line-clamp-1 text-sm text-stone-600"><span aria-hidden>📍 </span>{location}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-stone-700">
        {artisan.rating.average !== null && artisan.rating.count > 0 ? (
          <span className="font-medium text-stone-900">★ {artisan.rating.average}/5 <span className="font-normal text-stone-600">({t('service_reviews_count', { count: artisan.rating.count })})</span></span>
        ) : (
          <span className="font-medium text-stone-600">★ {t('artisan_card_new')} · {t('home_artisan_no_rating')}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {artisan.verification.steps.phone ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-blue-800">✓ {t('verif_phone')}</span> : null}
        {artisan.verification.steps.profile ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">✓ {t('artisan_card_kyc')}</span> : null}
        {artisan.verification.steps.identity ? <span className="rounded-full bg-teal-50 px-2 py-0.5 text-teal-800">✓ {t('verif_identity')}</span> : null}
        {artisan.verification.steps.recommended ? <span className="rounded-full bg-emerald-700 px-2 py-0.5 font-medium text-white">★ {t('verif_recommended')}</span> : null}
        {artisan.premium ? <span title={t('artisan_badge_premium_hint')} className="rounded-full bg-orange-100 px-2 py-0.5 font-medium text-orange-900">{t('artisan_badge_premium')}</span> : null}
        {artisan.isWomenLed ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">{t('badge_women')}</span> : null}
        {artisan.isCooperative ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">{t('badge_coop')}</span> : null}
      </div>
      <div className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">
        <p className="font-semibold text-stone-900">{artisan.priceFrom ? `${t('artisan_card_price_from')} ${formatXAF(artisan.priceFrom)}` : t('artisan_card_price_quote')}</p>
        <p className="text-stone-600"><span className="font-medium text-stone-800">{t('artisan_card_response')}:</span> {responseTime}</p>
        <p><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${availabilityClassName}`}><span aria-hidden>●</span>{t(`artisan_card_availability_${availability}`)}</span></p>
        {artisan.distanceKm !== null && artisan.distanceKm !== undefined ? <p className="text-stone-600">{t('artisan_card_distance', { distance: artisan.distanceKm })}</p> : null}
      </div>
      <div className={`mt-auto grid gap-2 pt-5 ${user?.role === 'artisan' || user?.role === 'admin' ? 'grid-cols-1' : 'grid-cols-[1fr_auto]'}`}>
        {user?.role === 'institution' ? (
          <>
            <Link href={`/messages?to=${artisan.seller.id}`} className="rounded-md bg-amber-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-amber-800">Messagerie</Link>
            {institutionalWhatsApp ? <a href={institutionalWhatsApp} target="_blank" rel="noreferrer" className="rounded-md border border-green-700 px-3 py-2 text-center text-sm font-medium text-green-800 hover:bg-green-50">WhatsApp</a> : null}
          </>
        ) : !user || user.role === 'client' ? (
          <Link href={quoteHref} className="rounded-md bg-amber-700 px-3 py-2 text-center text-sm font-medium text-white hover:bg-amber-800">
            {t('home_artisan_quote')}
          </Link>
        ) : null}
        <Link href={`/shop/${artisan.id}`} className="rounded-md border border-stone-300 px-3 py-2 text-center text-sm font-medium text-stone-700 hover:bg-stone-50">
          {t('home_artisan_view')}
        </Link>
      </div>
    </article>
  );
}

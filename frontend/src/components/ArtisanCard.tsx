'use client';

import Link from 'next/link';
import { categoryLabel } from '@/lib/categories';
import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';
import { resolveMediaUrl } from '@/lib/media';
import { VerificationBadge } from '@/components/VerificationBadge';
import type { PublicArtisan } from '@/lib/types';
import { whatsappHref } from '@/lib/whatsapp';

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

  return (
    <article className="flex h-full flex-col rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {artisan.coverImageUrl ? (
          <img src={resolveMediaUrl(artisan.coverImageUrl)} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xl font-semibold text-amber-800" aria-hidden>
            {artisan.name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-lg font-semibold text-stone-900">{artisan.name}</h3>
          {artisan.category ? <p className="mt-0.5 text-sm font-medium text-amber-700">{categoryLabel(artisan.category)}</p> : null}
          {location ? <p className="mt-1 line-clamp-1 text-sm text-stone-600">{location}</p> : null}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm text-stone-700">
        {artisan.rating.average && artisan.rating.count > 0 ? (
          <span className="font-medium text-stone-900">★ {artisan.rating.average}/5 <span className="font-normal text-stone-600">({t('service_reviews_count', { count: artisan.rating.count })})</span></span>
        ) : (
          <span className="font-medium text-stone-600">{t('home_artisan_no_rating')}</span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <VerificationBadge level={artisan.verification.level} />
          {artisan.premium ? <span className="rounded-full bg-amber-700 px-2 py-0.5 font-medium text-white">★ Premium</span> : null}
          {artisan.isWomenLed ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-800">{t('badge_women')}</span> : null}
          {artisan.isCooperative ? <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-800">{t('badge_coop')}</span> : null}
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

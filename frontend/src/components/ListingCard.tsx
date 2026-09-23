import Link from 'next/link';
import { categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import { useLanguage } from '@/lib/language-context';
import { resolveMediaUrl } from '@/lib/media';
import { DemoBadge } from '@/components/DemoBadge';
import type { Listing } from '@/lib/types';

export function ListingCard({ listing }: { listing: Listing }) {
  const { t, language } = useLanguage();
  const isDemo = listing.id.startsWith('demo-');
  const isSponsored = Boolean(listing.sponsoredUntil && new Date(listing.sponsoredUntil) > new Date());
  const href = isDemo ? '/contact' : `/listings/${listing.id}`;
  const isWoman = Boolean(
    listing.shop?.isWomenLed ||
    listing.seller?.gender === 'female',
  );
  const isCoop = Boolean(
    listing.shop?.isCooperative ||
    listing.seller?.gender === 'cooperative',
  );
  const isService = listing.type === 'service';
  const french = language === 'fr';
  const location = [listing.shop?.neighborhood, listing.shop?.city].filter(Boolean).join(', ');

  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:border-amber-600 hover:shadow-md"
    >
      {isDemo && <DemoBadge className="absolute right-2 top-2 z-10 shadow" />}
      {!isDemo && isSponsored && (
        <span
          title="Cette annonce bénéficie d'une mise en avant payée par l'artisan"
          className="absolute right-2 top-2 z-10 rounded-full bg-stone-900/85 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white shadow backdrop-blur-sm"
        >
          Sponsorisé
        </span>
      )}
      {isWoman && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-rose-600/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow backdrop-blur-sm">
          {t('badge_women')}
        </span>
      )}
      {!isWoman && isCoop && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-indigo-600/90 px-2.5 py-0.5 text-[11px] font-semibold text-white shadow backdrop-blur-sm">
          {t('badge_coop')}
        </span>
      )}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100 text-4xl">
        {(listing.imageUrls?.[0] || listing.imageUrl) ? (
          <img
            src={resolveMediaUrl(listing.imageUrls?.[0] || listing.imageUrl || '')}
            alt={listing.title}
            className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.02]"
          />
        ) : <span className="text-sm font-medium text-stone-500">{categoryLabel(listing.category)}</span>}
      </div>
      {listing.aiImageUrls?.length ? <p className="px-4 pt-2 text-xs font-medium text-amber-800">Image IA — mise en scène / inspiration</p> : null}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">{categoryLabel(listing.category)}</span>
          <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">{isService ? (french ? 'Service' : 'Service') : (french ? 'Produit' : 'Product')}</span>
        </div>
        <h3 className="line-clamp-2 min-h-12 text-lg font-semibold leading-tight text-stone-900 group-hover:text-amber-800">{listing.title}</h3>
        <p className="line-clamp-2 text-sm leading-5 text-stone-600">{listing.description}</p>
        <div className="mt-auto flex items-end justify-between gap-3 border-t border-stone-100 pt-3">
          <div>
            <p className="text-lg font-bold text-stone-950">{formatXAF(listing.price)}</p>
            <p className="max-w-48 truncate text-xs text-stone-500">{listing.seller?.name ?? (french ? 'Vendeur local' : 'Local seller')}{location ? ` · ${location}` : ''}</p>
          </div>
          <span className="text-xs font-medium text-amber-800">{french ? 'Voir détails →' : 'View details →'}</span>
        </div>
      </div>
    </Link>
  );
}

import Link from 'next/link';
import { categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import { useLanguage } from '@/lib/language-context';
import { resolveMediaUrl } from '@/lib/media';
import type { Listing } from '@/lib/types';

export function ListingCard({ listing }: { listing: Listing }) {
  const { t } = useLanguage();
  const isWoman = Boolean(
    listing.shop?.isWomenLed ||
    listing.seller?.gender === 'female',
  );
  const isCoop = Boolean(
    listing.shop?.isCooperative ||
    listing.seller?.gender === 'cooperative',
  );

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:border-amber-600 hover:shadow-sm"
    >
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
      <div className="relative flex h-52 w-full items-center justify-center overflow-hidden bg-stone-100 text-4xl">
        {(listing.imageUrls?.[0] || listing.imageUrl) ? (
          <img
            src={resolveMediaUrl(listing.imageUrls?.[0] || listing.imageUrl || '')}
            alt={listing.title}
            className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
          />
        ) : <span className="text-sm font-medium text-stone-500">{categoryLabel(listing.category)}</span>}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-wide text-stone-500">
          {categoryLabel(listing.category)}
        </span>
        <h3 className="font-medium group-hover:text-amber-800">{listing.title}</h3>
        <p className="line-clamp-2 text-sm text-stone-600">{listing.description}</p>
        <div className="mt-auto flex items-baseline justify-between gap-2 pt-3">
          <span className="text-lg font-semibold">{formatXAF(listing.price)}</span>
          {listing.seller && (
            <span className="truncate text-xs text-stone-500">{listing.seller.name}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

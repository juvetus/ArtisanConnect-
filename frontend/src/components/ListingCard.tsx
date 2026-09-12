import Link from 'next/link';
import { categoryIcon, categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import type { Listing } from '@/lib/types';

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white transition hover:border-amber-600 hover:shadow-sm"
    >
      <div className="flex aspect-4/3 items-center justify-center bg-stone-100 text-4xl">
        {categoryIcon(listing.category, listing.type)}
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

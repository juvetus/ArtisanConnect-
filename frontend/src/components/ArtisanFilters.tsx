'use client';

import { useRouter } from 'next/navigation';
import { SERVICE_CATEGORIES, PRODUCT_CATEGORIES, categoryLabel } from '@/lib/categories';
import { CITIES, NEIGHBORHOODS, slugify } from '@/lib/locations';

export function ArtisanFilters({
  category,
  city,
  neighborhood,
  verified,
  minRating,
}: {
  category?: string;
  city?: string;
  neighborhood?: string;
  verified: boolean;
  minRating: number;
}) {
  const router = useRouter();

  const navigate = (next: { category?: string; city?: string; neighborhood?: string; verified?: boolean; minRating?: number }) => {
    const nextCategory = next.category ?? category;
    const nextCity = next.city ?? city;
    const nextNeighborhood = next.neighborhood ?? neighborhood;
    const segments = [nextCategory, nextCity && slugify(nextCity)].filter(Boolean);

    const query = new URLSearchParams();
    if (nextNeighborhood) query.set('quartier', slugify(nextNeighborhood));
    if (next.verified ?? verified) query.set('verifie', '1');
    const rating = next.minRating ?? minRating;
    if (rating) query.set('note', String(rating));

    const suffix = query.toString();
    router.push(`/trouver-un-artisan${segments.length ? `/${segments.join('/')}` : ''}${suffix ? `?${suffix}` : ''}`);
  };

  const cityKey = city ? slugify(city) : '';
  const availableNeighborhoods = NEIGHBORHOODS[cityKey] ?? [];

  return (
    <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label className="text-sm font-medium text-stone-700">
        Métier
        <select
          value={category ?? ''}
          onChange={(event) => navigate({ category: event.target.value })}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        >
          <option value="">Tous les métiers</option>
          <optgroup label="Services">
            {SERVICE_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{categoryLabel(item.value)}</option>
            ))}
          </optgroup>
          <optgroup label="Produits">
            {PRODUCT_CATEGORIES.map((item) => (
              <option key={item.value} value={item.value}>{categoryLabel(item.value)}</option>
            ))}
          </optgroup>
        </select>
      </label>

      <label className="text-sm font-medium text-stone-700">
        Ville
        <select
          value={city ?? ''}
          onChange={(event) => navigate({ city: event.target.value, neighborhood: '' })}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        >
          <option value="">Toutes les villes</option>
          {CITIES.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-stone-700">
        Quartier
        <select
          value={neighborhood ?? ''}
          onChange={(event) => navigate({ neighborhood: event.target.value })}
          disabled={!availableNeighborhoods.length}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600 disabled:bg-stone-100"
        >
          <option value="">Tous les quartiers</option>
          {availableNeighborhoods.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium text-stone-700">
        Note minimale
        <select
          value={String(minRating)}
          onChange={(event) => navigate({ minRating: Number(event.target.value) })}
          className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        >
          <option value="0">Toutes les notes</option>
          <option value="3">3 ★ et plus</option>
          <option value="4">4 ★ et plus</option>
          <option value="4.5">4,5 ★ et plus</option>
        </select>
      </label>

      <label className="flex items-end gap-2 text-sm font-medium text-stone-700">
        <input
          type="checkbox"
          checked={verified}
          onChange={(event) => navigate({ verified: event.target.checked })}
          className="mb-2.5 h-4 w-4 rounded border-stone-300 accent-amber-700"
        />
        <span className="mb-2">Profil contrôlé uniquement</span>
      </label>
    </div>
  );
}

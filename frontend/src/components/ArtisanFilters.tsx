'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { SERVICE_CATEGORIES, PRODUCT_CATEGORIES, categoryLabel } from '@/lib/categories';
import { CITIES, NEIGHBORHOODS, slugify } from '@/lib/locations';

export function ArtisanFilters({
  category,
  city,
  neighborhood,
  verified,
  minRating,
  query,
}: {
  category?: string;
  city?: string;
  neighborhood?: string;
  verified: boolean;
  minRating: number;
  query?: string;
}) {
  const router = useRouter();
  const [draftQuery, setDraftQuery] = useState(query ?? '');
  // Les villes proposées viennent des boutiques réelles ; la liste statique sert de repli.
  const { data: locations } = useSWR('public-locations', api.publicLocations);

  const navigate = (next: {
    category?: string;
    city?: string;
    neighborhood?: string;
    verified?: boolean;
    minRating?: number;
    q?: string;
  }) => {
    const nextCategory = next.category ?? category;
    const nextCity = next.city ?? city;
    const nextNeighborhood = next.neighborhood ?? neighborhood;
    const segments = [nextCategory, nextCity && slugify(nextCity)].filter(Boolean);

    const params = new URLSearchParams();
    if (nextNeighborhood) params.set('quartier', slugify(nextNeighborhood));
    if (next.verified ?? verified) params.set('verifie', '1');
    const rating = next.minRating ?? minRating;
    if (rating) params.set('note', String(rating));
    const search = next.q ?? query;
    if (search) params.set('q', search);

    const suffix = params.toString();
    router.push(`/trouver-un-artisan${segments.length ? `/${segments.join('/')}` : ''}${suffix ? `?${suffix}` : ''}`);
  };

  const availableCities = locations?.length ? locations.map((item) => item.label) : CITIES;
  const cityKey = city ? slugify(city) : '';
  const matchedCity = locations?.find((item) => slugify(item.label) === cityKey);
  const availableNeighborhoods = matchedCity?.neighborhoods.length
    ? matchedCity.neighborhoods.map((item) => item.label)
    : NEIGHBORHOODS[cityKey] ?? [];

  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ q: draftQuery });
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input
          value={draftQuery}
          onChange={(event) => setDraftQuery(event.target.value)}
          aria-label="Rechercher un artisan, un métier ou un quartier"
          placeholder="Plombier à Bastos, menuisier, couture…"
          className="flex-1 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
        <button type="submit" className="rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-800">
          Rechercher
        </button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
            {availableCities.map((item) => (
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
    </div>
  );
}

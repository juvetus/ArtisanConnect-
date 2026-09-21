'use client';

import { FormEvent, useState } from 'react';
import useSWR from 'swr';
import { ListingCard } from '@/components/ListingCard';
import { Pagination } from '@/components/Pagination';
import { api } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';
import { CITIES, NEIGHBORHOODS, slugify } from '@/lib/locations';
import { PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';
import type { Listing } from '@/lib/types';

type Filters = { q?: string; category?: string; type?: 'product' | 'service'; city?: string; neighborhood?: string; minPrice?: number; maxPrice?: number };

export default function ListingsPage() {
  const { language } = useLanguage();
  const [filters, setFilters] = useState<Filters>({});
  const [draftQuery, setDraftQuery] = useState('');
  const [page, setPage] = useState(0);
  const take = 12;
  const { data, error, isLoading } = useSWR(['catalog-listings', filters, page], ([, currentFilters, currentPage]) => api.listings({ ...(currentFilters as Filters), skip: (currentPage as number) * take, take }));
  const [listings, total] = data ?? [[], 0];
  const cityNeighborhoods = filters.city ? NEIGHBORHOODS[slugify(filters.city)] ?? [] : [];

  const updateFilters = (patch: Partial<Filters>) => {
    setFilters((current) => {
      const next = { ...current, ...patch };
      if (patch.city !== undefined) next.neighborhood = undefined;
      return Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined && value !== '')) as Filters;
    });
    setPage(0);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    updateFilters({ q: draftQuery.trim() || undefined });
  };

  const french = language === 'fr';
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{french ? 'Catalogue' : 'Catalog'}</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{french ? 'Annonces : produits et services' : 'Listings: products and services'}</h1>
        <p className="mt-2 text-stone-600">{french ? 'Découvrez les produits et services proposés par les artisans camerounais.' : 'Discover products and services offered by Cameroonian artisans.'}</p>
      </header>

      <section className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
        <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
          <input value={draftQuery} onChange={(event) => setDraftQuery(event.target.value)} placeholder={french ? 'Rechercher un produit, un service ou un métier...' : 'Search for a product, service or trade...'} className="flex-1 rounded-md border border-stone-300 px-3 py-3 outline-none focus:border-amber-600" />
          <button type="submit" className="rounded-md bg-stone-900 px-5 py-3 text-sm font-medium text-white hover:bg-stone-800">{french ? 'Rechercher' : 'Search'}</button>
        </form>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-medium text-stone-700">{french ? 'Type' : 'Type'}<select value={filters.type ?? ''} onChange={(event) => updateFilters({ type: (event.target.value || undefined) as Filters['type'] })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"><option value="">{french ? 'Produits et services' : 'Products and services'}</option><option value="product">{french ? 'Produits' : 'Products'}</option><option value="service">{french ? 'Services' : 'Services'}</option></select></label>
          <label className="text-sm font-medium text-stone-700">{french ? 'Ville' : 'City'}<select value={filters.city ?? ''} onChange={(event) => updateFilters({ city: event.target.value || undefined })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"><option value="">{french ? 'Toutes les villes' : 'All cities'}</option>{CITIES.map((city) => <option key={city} value={city}>{city}</option>)}</select></label>
          <label className="text-sm font-medium text-stone-700">{french ? 'Quartier' : 'Neighborhood'}<select value={filters.neighborhood ?? ''} disabled={!cityNeighborhoods.length} onChange={(event) => updateFilters({ neighborhood: event.target.value || undefined })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 disabled:bg-stone-100"><option value="">{french ? 'Tous les quartiers' : 'All neighborhoods'}</option>{cityNeighborhoods.map((neighborhood) => <option key={neighborhood} value={neighborhood}>{neighborhood}</option>)}</select></label>
          <label className="text-sm font-medium text-stone-700">{french ? 'Budget min. (FCFA)' : 'Min. budget (XAF)'}<input type="number" min={0} step={500} value={filters.minPrice ?? ''} onChange={(event) => updateFilters({ minPrice: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-stone-700">{french ? 'Budget max. (FCFA)' : 'Max. budget (XAF)'}<input type="number" min={0} step={500} value={filters.maxPrice ?? ''} onChange={(event) => updateFilters({ maxPrice: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></label>
        </div>
        <details><summary className="cursor-pointer text-sm font-medium text-stone-700">{french ? 'Choisir une catégorie' : 'Choose a category'}</summary><div className="mt-3 flex flex-wrap gap-2">{[...PRODUCT_CATEGORIES, ...SERVICE_CATEGORIES].map((category) => <button key={category.value} type="button" onClick={() => updateFilters({ category: filters.category === category.value ? undefined : category.value })} className={`rounded-full border px-3 py-1.5 text-sm ${filters.category === category.value ? 'border-amber-700 bg-amber-700 text-white' : 'border-stone-300 bg-white text-stone-700'}`}>{categoryLabel(category.value)}</button>)}</div></details>
      </section>

      {error ? <p className="rounded-md bg-amber-50 p-4 text-sm text-amber-900">{french ? 'Le catalogue est momentanément indisponible.' : 'The catalog is temporarily unavailable.'}</p> : null}
      {isLoading ? <p className="text-stone-600">{french ? 'Chargement...' : 'Loading...'}</p> : !listings.length ? <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-600">{french ? 'Aucune annonce ne correspond à votre recherche.' : 'No listings match your search.'}</p> : <><p className="text-sm text-stone-600">{total} {french ? 'annonce(s)' : 'listing(s)'}</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{(listings as Listing[]).map((listing) => <ListingCard key={listing.id} listing={listing} />)}</div><Pagination page={page} hasPrevious={page > 0} hasNext={(page + 1) * take < total} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} /></>}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { ListingCard } from '@/components/ListingCard';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES } from '@/lib/categories';

export default function HomePage() {
  const [filters, setFilters] = useState<{ q?: string; category?: string }>({});
  const [draftQuery, setDraftQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR(
    ['listings', filters],
    ([, params]) => api.listings(params),
    // Sans cela, un retour sur l'onglet relancerait la requête et donc le défilement.
    { revalidateOnFocus: false },
  );

  const [listings, total] = data ?? [[], 0];
  const hasFilter = Boolean(filters.q || filters.category);

  // Le défilement attend l'arrivée des résultats : tant que SWR n'a pas répondu, la page
  // a encore la hauteur de la liste précédente et la cible serait mal placée.
  useEffect(() => {
    if (!data || !hasFilter) return;
    resultsRef.current?.scrollIntoView({ block: 'start' });
  }, [data, hasFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draftQuery ? { q: draftQuery } : {});
  };

  const selectCategory = (value: string) => {
    setDraftQuery('');
    setShowCategories(false);
    setFilters(value ? { category: value } : {});
  };

  const activeCategory = CATEGORIES.find((c) => c.value === filters.category);

  return (
    <div className="space-y-8">
      <section className="rounded-xl bg-amber-800 px-6 py-10 text-white">
        <h1 className="text-3xl font-semibold">Le savoir-faire camerounais, à portée de main</h1>
        <p className="mt-2 max-w-2xl text-amber-100">
          Vannerie, toghu, sculpture, couture, menuiserie… Commandez directement auprès
          d&apos;artisans près de chez vous et réglez en espèces à la remise.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex max-w-2xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <span
              aria-hidden
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-stone-400"
            >
              🔍
            </span>
            <input
              value={draftQuery}
              onChange={(e) => setDraftQuery(e.target.value)}
              aria-label="Rechercher une annonce"
              placeholder="Rechercher un objet, un service…"
              className="w-full rounded-lg border-2 border-transparent bg-white py-3 pl-12 pr-4 text-base text-stone-900 shadow-lg outline-none placeholder:text-stone-500 focus:border-amber-300"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-stone-900 px-6 py-3 font-medium text-white shadow-lg hover:bg-stone-800"
          >
            Rechercher
          </button>
        </form>
      </section>

      <div ref={resultsRef} className="scroll-mt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCategories((open) => !open)}
            aria-expanded={showCategories}
            className="flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm hover:border-amber-600"
          >
            Filtrer par catégorie
            <span className={`transition-transform ${showCategories ? 'rotate-180' : ''}`}>▾</span>
          </button>

          {activeCategory ? (
            <button
              onClick={() => selectCategory('')}
              className="flex items-center gap-2 rounded-full border border-amber-700 bg-amber-700 px-4 py-1.5 text-sm text-white"
            >
              {activeCategory.icon} {activeCategory.label}
              <span aria-hidden>✕</span>
              <span className="sr-only">Retirer le filtre</span>
            </button>
          ) : (
            <span className="text-sm text-stone-500">Toutes les catégories</span>
          )}
        </div>

        {showCategories &&
          [
            { title: "Métiers d'art", items: PRODUCT_CATEGORIES },
            { title: 'Services', items: SERVICE_CATEGORIES },
          ].map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-stone-500">
                {group.title}
              </p>
              <div className="flex flex-wrap gap-2">
                {group.items.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => selectCategory(c.value)}
                    className={`rounded-full border px-4 py-1.5 text-sm ${
                      filters.category === c.value
                        ? 'border-amber-700 bg-amber-700 text-white'
                        : 'border-stone-300 bg-white hover:border-amber-600'
                    }`}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
      </div>

      <div className="space-y-5">
        {isLoading ? (
          <p className="text-stone-600">Chargement…</p>
        ) : error ? (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            Impossible de charger le catalogue. Le serveur est-il démarré ?
          </p>
        ) : listings.length === 0 ? (
          <p className="rounded-md border border-stone-200 bg-white p-8 text-center text-stone-600">
            Aucune annonce ne correspond à votre recherche.
          </p>
        ) : (
          <>
            <p className="text-sm text-stone-600">
              {total} annonce{total > 1 ? 's' : ''}
              {filters.q && ` pour « ${filters.q} »`}
            </p>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

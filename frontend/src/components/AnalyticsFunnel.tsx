'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';

const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: 'visitors', label: 'Visiteurs' },
  { key: 'searches', label: 'Recherches' },
  { key: 'artisanProfileViews', label: 'Profils consultés' },
  { key: 'listingViews', label: 'Annonces consultées' },
  { key: 'whatsappClicks', label: 'Contacts WhatsApp' },
  { key: 'quoteRequests', label: 'Demandes de devis' },
  { key: 'orders', label: 'Commandes' },
];

export function AnalyticsFunnel() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useSWR(['analytics-funnel', days], ([, period]) => api.analyticsFunnel(period as number));

  const funnel = data?.funnel;
  const maxValue = funnel ? Math.max(...FUNNEL_STEPS.map((step) => funnel[step.key] ?? 0), 1) : 1;

  return (
    <section className="space-y-6 rounded-lg border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Tunnel de conversion</h2>
          <p className="mt-1 text-sm text-stone-600">Du visiteur à la commande, sur les données réelles de la plateforme.</p>
        </div>
        <label className="text-sm font-medium text-stone-700">
          Période
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="ml-2 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value={7}>7 jours</option>
            <option value={30}>30 jours</option>
            <option value={90}>90 jours</option>
          </select>
        </label>
      </div>

      {isLoading || !data ? (
        <p className="text-sm text-stone-600">Chargement des mesures…</p>
      ) : (
        <>
          <div className="space-y-2">
            {FUNNEL_STEPS.map((step) => {
              const value = funnel?.[step.key] ?? 0;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <span className="w-44 shrink-0 text-sm text-stone-600">{step.label}</span>
                  <div className="h-7 flex-1 overflow-hidden rounded bg-stone-100">
                    <div
                      className="h-full rounded bg-amber-600"
                      style={{ width: `${Math.max((value / maxValue) * 100, value > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-sm font-semibold text-stone-900">{value}</span>
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Visiteur → demande', `${data.conversion.visitorToQuote}%`],
              ['Visiteur → commande', `${data.conversion.visitorToOrder}%`],
              ['Demande → réponse artisan', `${data.conversion.quoteToAnswer}%`],
              ['Profil vu → WhatsApp', `${data.conversion.profileViewToWhatsapp}%`],
              ['Artisans inscrits', data.artisans.registered],
              ['Artisans actifs', data.artisans.active],
              ['Identités vérifiées', data.artisans.withIdentityVerified],
              ['Formulaires de devis ouverts', data.funnel.quoteFormsOpened],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-md border border-stone-200 p-4">
                <p className="text-sm text-stone-600">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {([
              { title: 'Recherches les plus fréquentes', rows: data.topSearches },
              { title: 'Catégories les plus consultées', rows: data.topCategories },
              { title: 'Villes les plus actives', rows: data.topCities },
            ]).map(({ title, rows }) => (
              <div key={title}>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">{title}</h3>
                {!rows.length ? (
                  <p className="mt-2 text-sm text-stone-500">Aucune donnée sur la période.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {rows.map((row) => (
                      <li key={row.label} className="flex justify-between gap-3 border-b border-stone-100 py-1 last:border-0">
                        <span className="truncate text-stone-700">{row.label}</span>
                        <span className="font-medium text-stone-900">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

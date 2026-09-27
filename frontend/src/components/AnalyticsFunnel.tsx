'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { Pagination } from './Pagination';
import type { AnalyticsFunnel as AnalyticsFunnelData } from '@/lib/types';

const FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: 'visitors', label: 'Visiteurs' },
  { key: 'searches', label: 'Recherches' },
  { key: 'artisanProfileViews', label: 'Profils consultés' },
  { key: 'listingViews', label: 'Annonces consultées' },
  { key: 'whatsappClicks', label: 'Contacts WhatsApp' },
  { key: 'quoteRequests', label: 'Demandes de devis' },
  { key: 'serviceRequests', label: 'Demandes de prestation' },
  { key: 'acceptedQuotes', label: 'Devis acceptés' },
  { key: 'orders', label: 'Commandes' },
  { key: 'completedTransactions', label: 'Commandes/prestations terminées' },
  { key: 'verifiedReviews', label: 'Avis vérifiés' },
  { key: 'returningClients', label: 'Clients revenus' },
];

type FunnelMetricCard =
  | { label: string; value: number; ratio?: never }
  | { label: string; ratio: AnalyticsFunnelData['conversion'][keyof AnalyticsFunnelData['conversion']]; value?: never };

export function AnalyticsFunnel() {
  const [days, setDays] = useState(30);
  const [rankingPage, setRankingPage] = useState(0);
  const { data, isLoading } = useSWR(['analytics-funnel', days], ([, period]) => api.analyticsFunnel(period as number));

  const funnel = data?.funnel;
  const maxValue = funnel ? Math.max(...FUNNEL_STEPS.map((step) => funnel[step.key] ?? 0), 1) : 1;
  const metricCards: FunnelMetricCard[] = data ? [
    { label: 'Visiteur → formulaire devis ouvert', ratio: data.conversion.visitorToQuote },
    { label: 'Visiteur → commande/demande publiée', ratio: data.conversion.visitorToOrder },
    { label: 'Demande ciblée → réponse', ratio: data.conversion.quoteToAnswer },
    { label: 'Profil consulté → WhatsApp', ratio: data.conversion.profileViewToWhatsapp },
    { label: 'Devis → acceptation', ratio: data.conversion.quoteToAcceptance },
    { label: 'Commande/demande → clôture', ratio: data.conversion.completionRate },
    { label: 'Transaction terminée → avis', ratio: data.conversion.completedOrderToReview },
    { label: 'Artisans inscrits', value: data.artisans.registered },
    { label: 'Profil artisan complet', value: data.artisans.profileComplete },
    { label: 'Artisans avec offre réelle', value: data.artisans.withRealOffers },
    { label: 'Artisans ayant répondu', value: data.artisans.receivedResponse },
    { label: 'Boutiques réelles actives', value: data.artisans.active },
    { label: 'Identités réelles vérifiées', value: data.artisans.withIdentityVerified },
    { label: 'Formulaires de devis ouverts', value: data.funnel.quoteFormsOpened },
  ] : [];

  return (
    <section className="space-y-6 rounded-lg border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Tunnel de conversion</h2>
          <p className="mt-1 text-sm text-stone-600">Interactions et transactions du pilote; les données démo sont exclues.</p>
        </div>
        <label className="text-sm font-medium text-stone-700">
          Période
          <select
            value={days}
            onChange={(event) => { setDays(Number(event.target.value)); setRankingPage(0); }}
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
          {Object.values(data.dataQuality).some((count) => count > 0) ? (
            <p role="status" className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              Les données de démonstration sont exclues des conversions : {data.dataQuality.demoEventsExcluded} événements, {data.dataQuality.demoRequestsExcluded} demandes, {data.dataQuality.demoServiceOrdersExcluded} demandes de prestation, {data.dataQuality.demoListingsExcluded} annonces et {data.dataQuality.demoServicesExcluded} services. Historiques non classés (également exclus) : {data.dataQuality.unclassifiedEvents} événements, {data.dataQuality.unclassifiedRequests} demandes, {data.dataQuality.unclassifiedServiceOrders} demandes de prestation et {data.dataQuality.unclassifiedShops} boutiques.
            </p>
          ) : null}
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
            {metricCards.map(({ label, value, ratio }) => (
              <div key={label} className="rounded-md border border-stone-200 p-4">
                <p className="text-sm text-stone-600">{label}</p>
                {ratio ? <>
                  <p className="mt-1 text-2xl font-semibold text-stone-900">{ratio.percent}%</p>
                  <p className="mt-1 text-xs text-stone-500">{ratio.numerator} / {ratio.denominator}</p>
                </> : <p className="mt-1 text-2xl font-semibold text-stone-900">{value}</p>}
              </div>
            ))}
          </div>

          <section className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">Valeur des offres payantes</h3>
              <p className="mt-1 text-sm text-stone-600">Mesure descriptive de la période; elle ne prouve pas encore un effet causal sur les ventes.</p>
            </div>
            <div className="overflow-x-auto rounded-md border border-stone-200">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Vues</th><th className="px-4 py-3">Clics</th><th className="px-4 py-3">Souscriptions</th><th className="px-4 py-3">Actives</th><th className="px-4 py-3">Revenus</th></tr></thead>
                <tbody>{data.commercial.map((row) => <tr key={row.plan} className="border-t border-stone-100"><th className="px-4 py-3 font-medium text-stone-800">{row.plan}</th><td className="px-4 py-3 text-stone-600">{row.views}</td><td className="px-4 py-3 text-stone-600">{row.ctas}</td><td className="px-4 py-3 text-stone-600">{row.subscriptions}</td><td className="px-4 py-3 text-stone-600">{row.active}</td><td className="px-4 py-3 text-stone-600">{row.revenue.toLocaleString('fr-FR')} FCFA</td></tr>)}</tbody>
              </table>
              {!data.commercial.length ? <p className="p-4 text-sm text-stone-500">Aucune donnée commerciale réelle sur la période.</p> : null}
            </div>
          </section>

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
                    {rows.slice(rankingPage * 5, (rankingPage + 1) * 5).map((row) => (
                      <li key={row.label} className="flex justify-between gap-3 border-b border-stone-100 py-1 last:border-0">
                        <span className="truncate text-stone-700">{row.label}</span>
                        <span className="font-medium text-stone-900">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {rows.length > 5 ? <Pagination page={rankingPage} hasPrevious={rankingPage > 0} hasNext={(rankingPage + 1) * 5 < rows.length} onPrevious={() => setRankingPage((current) => Math.max(0, current - 1))} onNext={() => setRankingPage((current) => current + 1)} /> : null}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

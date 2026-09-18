import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatXAF } from '@/lib/format';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const metadata: Metadata = {
  title: 'Tarifs ArtisanConnect | Offre gratuite et Premium pour artisans',
  description:
    'Créez votre boutique gratuitement au Cameroun. Passez à Premium pour publier sans limite, apparaître en priorité dans les résultats et recevoir plus de demandes de devis.',
  alternates: { canonical: `${siteUrl}/tarifs` },
  openGraph: { title: 'Tarifs ArtisanConnect', url: `${siteUrl}/tarifs`, type: 'website' },
};

const FREE_FEATURES = [
  'Profil artisan et boutique en ligne',
  "Jusqu'à 5 annonces actives",
  'Réception des demandes de devis',
  'Messagerie et bouton WhatsApp',
  'Avis clients vérifiés',
  'Badges de vérification',
  'Tableau de bord de base',
];

const PREMIUM_FEATURES = [
  { label: 'Tout ce que contient l’offre gratuite', available: true },
  { label: 'Annonces et services illimités', available: true },
  { label: 'Mise en avant dans les résultats de recherche', available: true },
  { label: 'Priorité sur les demandes de devis', available: true },
  { label: 'Badge Premium sur votre fiche', available: true },
  { label: 'Statistiques détaillées : vues, contacts, taux de réponse', available: true },
  { label: 'Annonces sponsorisées : 2 mises en avant de 7 jours', available: true },
  { label: 'Catalogue imprimable', available: false },
];

const COMPARISON = [
  ['Boutique en ligne', 'Incluse', 'Incluse'],
  ['Annonces actives', '5 maximum', 'Illimitées'],
  ['Demandes de devis reçues', 'Oui', 'Oui, en priorité'],
  ['Position dans les résultats', 'Standard', 'Mise en avant'],
  ['Badge Premium', '—', 'Oui'],
  ['Annonces sponsorisées', '—', '2 simultanées'],
  ['Statistiques', 'De base', 'Détaillées'],
  ['Commission sur les ventes', '5 %', '5 %'],
];

export default async function PricingPage() {
  let premiumPrice = 5000;
  let premiumPlanId: string | null = null;
  try {
    const plans = await api.getSubscriptionPlans();
    const premium = plans.find((plan) => plan.name.toLowerCase().includes('premium')) ?? plans[0];
    if (premium) {
      premiumPrice = Number(premium.price);
      premiumPlanId = premium.id;
    }
  } catch {
    // Le tarif de référence reste affiché si l'API est indisponible.
  }

  return (
    <div className="space-y-10">
      <header className="rounded-xl bg-stone-900 px-6 py-10 text-white lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">Nos offres</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
          Commencez gratuitement. Passez à Premium quand les clients arrivent.
        </h1>
        <p className="mt-4 max-w-2xl text-stone-200">
          ArtisanConnect met en relation les artisans camerounais et les clients de leur quartier. Créer sa boutique ne
          coûte rien : vous ne payez que si vous voulez plus de visibilité.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="flex flex-col rounded-xl border border-stone-200 bg-white p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-stone-500">Offre gratuite</p>
          <p className="mt-2 text-3xl font-semibold text-stone-900">0 FCFA</p>
          <p className="mt-1 text-sm text-stone-600">Sans engagement, sans carte bancaire.</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-700">
            {FREE_FEATURES.map((feature) => (
              <li key={feature} className="flex gap-2">
                <span aria-hidden className="text-emerald-600">✔</span>
                {feature}
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="mt-6 rounded-md border border-stone-300 px-5 py-3 text-center text-sm font-semibold text-stone-800 hover:bg-stone-50"
          >
            Créer ma boutique gratuitement
          </Link>
        </article>

        <article className="flex flex-col rounded-xl border-2 border-amber-600 bg-amber-50/50 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Premium Artisan</p>
            <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-semibold text-white">★ Recommandé</span>
          </div>
          <p className="mt-2 text-3xl font-semibold text-stone-900">
            {formatXAF(premiumPrice)} <span className="text-base font-normal text-stone-600">/ mois</span>
          </p>
          <p className="mt-1 text-sm text-stone-600">Paiement Mobile Money, résiliable à tout moment.</p>
          <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-700">
            {PREMIUM_FEATURES.map((feature) => (
              <li key={feature.label} className="flex gap-2">
                <span aria-hidden className={feature.available ? 'text-emerald-600' : 'text-stone-400'}>
                  {feature.available ? '✔' : '○'}
                </span>
                <span className={feature.available ? '' : 'text-stone-500'}>
                  {feature.label}
                  {feature.available ? '' : ' (bientôt disponible)'}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={premiumPlanId ? '/payment?type=subscription' : '/register'}
            className="mt-6 rounded-md bg-amber-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-amber-800"
          >
            Passer à Premium
          </Link>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 p-6 text-xl font-semibold text-stone-900">Comparer les deux offres</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th scope="col" className="px-6 py-3">Fonctionnalité</th>
              <th scope="col" className="px-6 py-3">Gratuit</th>
              <th scope="col" className="px-6 py-3">Premium</th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON.map(([feature, free, premium]) => (
              <tr key={feature} className="border-t border-stone-100">
                <th scope="row" className="px-6 py-3 font-medium text-stone-800">{feature}</th>
                <td className="px-6 py-3 text-stone-600">{free}</td>
                <td className="px-6 py-3 font-medium text-amber-800">{premium}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">Questions fréquentes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            [
              'Dois-je payer pour recevoir des demandes ?',
              'Non. Les demandes de devis sont envoyées aux artisans dont le métier et la ville correspondent, qu’ils soient Premium ou non. Premium départage seulement les profils de pertinence équivalente.',
            ],
            [
              'Comment se fait le paiement ?',
              'Par Mobile Money depuis votre espace artisan. L’abonnement dure 30 jours et n’est pas prélevé automatiquement sans votre action.',
            ],
            [
              'Que se passe-t-il si j’arrête Premium ?',
              'Votre boutique et vos avis restent en ligne. Vous repassez simplement à la limite de 5 annonces actives.',
            ],
            [
              'Y a-t-il une commission sur les ventes ?',
              'Oui, 5 % sur les commandes payées via la plateforme, identique en gratuit et en Premium.',
            ],
          ].map(([question, answer]) => (
            <article key={question} className="rounded-lg border border-stone-200 bg-white p-5">
              <h3 className="font-semibold text-stone-900">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-amber-50 p-6 text-center lg:p-10">
        <h2 className="text-2xl font-semibold text-stone-900">Vous cherchez plutôt un artisan ?</h2>
        <p className="mx-auto mt-2 max-w-2xl text-stone-700">
          Côté client, tout est gratuit : recherche, demandes de devis et mise en relation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/trouver-un-artisan" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">
            Trouver un artisan
          </Link>
          <Link href="/customer-requests" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">
            Demander un devis
          </Link>
        </div>
      </section>
    </div>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatXAF } from '@/lib/format';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const metadata: Metadata = {
  title: 'Tarifs ArtisanConnect | Starter, Local Plus et Premium Growth',
  description:
    'Créez votre boutique gratuitement au Cameroun. Passez à Local Plus ou Premium Growth pour gagner en visibilité et recevoir plus de demandes de devis.',
  alternates: { canonical: `${siteUrl}/tarifs` },
  openGraph: { title: 'Tarifs ArtisanConnect', url: `${siteUrl}/tarifs`, type: 'website' },
};

type Plan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  currency: string;
  durationDays: number;
  description: string;
  features: string[];
  sortOrder: number;
};

const FALLBACK_PLANS: Plan[] = [
  {
    id: 'starter',
    slug: 'starter',
    name: 'Starter',
    price: 0,
    currency: 'XAF',
    durationDays: 30,
    description: 'Pour démarrer et présenter son activité localement.',
    features: ['Profil artisan', '5 annonces actives', 'Réception de demandes de devis', 'Messagerie et WhatsApp'],
    sortOrder: 1,
  },
  {
    id: 'visibilite-7',
    slug: 'visibilite-7',
    name: 'Visibilité 7 jours',
    price: 1000,
    currency: 'XAF',
    durationDays: 7,
    description: 'Un petit coup de visibilité pour tester la plateforme sans gros budget.',
    features: ['Tout le plan Starter', '1 annonce mise en avant pendant 7 jours', 'Badge de visibilité locale'],
    sortOrder: 2,
  },
  {
    id: 'local-plus',
    slug: 'local-plus',
    name: 'Local Plus',
    price: 3000,
    currency: 'XAF',
    durationDays: 30,
    description: 'Pour rester visible tout le mois avec un budget accessible.',
    features: ['Tout le plan Starter', 'Annonces illimitées', '2 annonces mises en avant pendant 7 jours', 'Priorité locale'],
    sortOrder: 3,
  },
  {
    id: 'croissance',
    slug: 'croissance',
    name: 'Croissance',
    price: 5000,
    currency: 'XAF',
    durationDays: 30,
    description: 'Pour attirer régulièrement de nouveaux clients et mieux présenter son activité.',
    features: ['Tout le plan Local Plus', '3 annonces mises en avant pendant 15 jours', 'Statistiques de base', 'Support prioritaire'],
    sortOrder: 4,
  },
  {
    id: 'premium-growth',
    slug: 'premium-growth',
    name: 'Premium Growth',
    price: 10000,
    currency: 'XAF',
    durationDays: 30,
    description: 'Pour accélérer votre croissance et booster votre activité.',
    features: ['Tout le plan Local Plus', 'Badge Premium Growth', '5 annonces mises en avant pendant 30 jours', 'Statistiques détaillées et support prioritaire'],
    sortOrder: 5,
  },
];

export default async function PricingPage() {
  let plans: Plan[] = FALLBACK_PLANS;

  try {
    const remotePlans = await api.getSubscriptionPlans();
    if (remotePlans.length) {
      plans = remotePlans
        .map((plan) => {
          const slug = plan.slug ?? plan.name.toLowerCase().replace(/\s+/g, '-');
          const fallback = FALLBACK_PLANS.find((item) => item.slug === slug);
          return {
            id: plan.id,
            slug,
            name: plan.name,
            price: Number(plan.price),
            currency: plan.currency ?? 'XAF',
            durationDays: Number(plan.durationDays ?? 30),
            description: plan.description || fallback?.description || 'Offre adaptée à votre activité.',
            features: plan.features && plan.features.length ? [...plan.features] : fallback?.features ?? ['Profil artisan', 'Visibilité locale'],
            sortOrder: Number(plan.sortOrder ?? fallback?.sortOrder ?? 0),
          };
        })
        .sort((a, b) => a.sortOrder - b.sortOrder);
    }
  } catch {
    // On garde les offres par défaut si l’API est indisponible.
  }

  const recommendedPlan = plans.find((plan) => plan.slug === 'local-plus') ?? plans[1] ?? plans[0];
  const comparisonRows: ReadonlyArray<readonly [string, readonly string[]]> = [
    ['Boutique en ligne', ['Incluse', 'Incluse', 'Incluse', 'Incluse', 'Incluse']],
    ['Annonces actives', ['Jusqu’à 5', 'Jusqu’à 5', 'Illimitées', 'Illimitées', 'Illimitées']],
    ['Mise en avant', ['Standard', '1 annonce / 7 jours', '2 annonces / 7 jours', '3 annonces / 15 jours', '5 annonces / 30 jours']],
    ['Demandes de devis', ['Oui', 'Oui', 'Oui', 'Oui, priorisées', 'Oui, prioritaires']],
    ['Badge', ['—', 'Visibilité locale', '—', '—', 'Premium Growth']],
    ['Statistiques', ['Base', 'Base', 'Base', 'Base', 'Détaillées']],
  ];

  return (
    <div className="space-y-10">
      <header className="rounded-xl bg-stone-900 px-6 py-10 text-white lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">Nos offres</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">
          Commencez gratuitement. Passez au bon niveau dès que vous voulez gagner plus de visibilité.
        </h1>
        <p className="mt-4 max-w-2xl text-stone-200">
          ArtisanConnect aide les artisans camerounais à vendre plus facilement, avec un compte simple à démarrer et des options de croissance selon leurs besoins.
        </p>
      </header>

      <section className={`grid gap-6 ${plans.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {plans.map((plan) => {
          const isRecommended = recommendedPlan?.id === plan.id;
          const isFree = Number(plan.price) === 0;

          return (
            <article
              key={plan.id}
              className={`flex flex-col rounded-xl border p-6 ${isRecommended ? 'border-amber-600 bg-amber-50/60 shadow-sm' : 'border-stone-200 bg-white'}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium uppercase tracking-wide text-stone-500">{plan.name}</p>
                {isRecommended ? (
                  <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-semibold text-white">★ Recommandé</span>
                ) : null}
              </div>

              <p className="mt-3 text-3xl font-semibold text-stone-900">
                {isFree ? '0 FCFA' : `${formatXAF(Number(plan.price))}`}
                {!isFree ? <span className="text-base font-normal text-stone-600"> / {plan.durationDays === 30 ? '30 jours' : `${plan.durationDays} jours`}</span> : null}
              </p>

              <p className="mt-2 text-sm text-stone-600">{plan.description || 'Offre adaptée à votre activité.'}</p>

              <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-700">
                {(plan.features && plan.features.length ? plan.features : ['Profil artisan', 'Visibilité locale']).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden className="text-emerald-600">✔</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={isFree ? '/register' : `/payment?type=subscription&plan=${encodeURIComponent(plan.id)}`}
                className={`mt-6 rounded-md px-5 py-3 text-center text-sm font-semibold transition ${
                  isRecommended ? 'bg-amber-700 text-white hover:bg-amber-800' : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                }`}
              >
                {isFree ? 'Créer ma boutique' : `Choisir ${plan.name}`}
              </Link>
            </article>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <h2 className="border-b border-stone-200 p-6 text-xl font-semibold text-stone-900">Comparer les offres</h2>
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th scope="col" className="px-6 py-3">Fonctionnalité</th>
              {plans.map((plan) => (
                <th key={plan.id} scope="col" className="px-6 py-3">
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonRows.map(([feature, values]) => (
              <tr key={feature} className="border-t border-stone-100">
                <th scope="row" className="px-6 py-3 font-medium text-stone-800">{feature}</th>
                {values.map((value, index) => (
                  <td key={`${feature}-${plans[index]?.id ?? index}`} className="px-6 py-3 text-stone-600">
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-stone-900">Questions fréquentes</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ['Dois-je payer pour recevoir des demandes ?', 'Non. Les demandes de devis peuvent être reçues même avec le plan Starter. Le plan payant sert surtout à gagner plus de visibilité et de rapidité.'],
            ['Comment se fait le paiement ?', 'Le paiement s’effectue par Mobile Money depuis votre espace artisan, selon le plan choisi et la durée de validité.'],
            ['Que se passe-t-il si je change de plan ?', 'Votre plan est remplacé et la nouvelle validité est recalculée selon le paiement effectué.'],
            ['Y a-t-il une commission sur les ventes ?', 'Oui, 5 % sur les commandes payées via la plateforme, quel que soit le plan choisi.'],
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

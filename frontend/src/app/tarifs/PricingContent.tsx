'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useLanguage } from '@/lib/language-context';
import { formatXAF } from '@/lib/format';
import { trackEvent } from '@/lib/analytics';

export type PricingPlan = {
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

const ENGLISH_PLANS: Record<string, { name: string; description: string; features: string[] }> = {
  starter: { name: 'Free', description: 'Receive quote requests and get started at no cost.', features: ['Artisan profile', '3 active listings', 'Receive quote requests', 'Messaging and WhatsApp'] },
  'local-plus': { name: 'Pro', description: 'Grow your presence and feature your offers.', features: ['Everything in Free', 'Unlimited listings', '2 featured listings for 7 days', 'Local priority'] },
  'premium-growth': { name: 'Premium', description: 'Build visibility and grow your activity.', features: ['Everything in Pro', '5 featured listings for 30 days'] },
  'visibilite-7': { name: 'Boost', description: 'A one-off visibility boost for 7 days.', features: ['Everything in Free', '1 featured listing for 7 days'] },
};

export function PricingContent({ plans }: { plans: PricingPlan[] }) {
  const { language, t } = useLanguage();
  const english = language === 'en';
  useEffect(() => { trackEvent('pricing_view'); }, []);
  const recommendedPlan = plans.find((plan) => plan.slug === 'local-plus') ?? plans[1] ?? plans[0];
  const comparisonRows: ReadonlyArray<readonly [string, readonly string[]]> = english
    ? [
        ['Online shop', ['Included', 'Included', 'Included', 'Included']],
        ['Active listings', ['Up to 3', 'Unlimited', 'Unlimited', 'Up to 3']],
        ['Featured listings', ['Standard', '2 listings / 7 days', '5 listings / 30 days', '1 listing / 7 days']],
        ['Quote requests', ['Yes', 'Yes', 'Yes', 'Yes']],
        ['Visibility', ['—', 'Paid promotion', 'Paid promotion', 'Paid promotion']],
      ]
    : [
        ['Boutique en ligne', ['Incluse', 'Incluse', 'Incluse', 'Incluse']],
        ['Annonces actives', ['Jusqu’à 3', 'Illimitées', 'Illimitées', 'Jusqu’à 3']],
        ['Mise en avant', ['Standard', '2 annonces / 7 jours', '5 annonces / 30 jours', '1 annonce / 7 jours']],
        ['Demandes de devis', ['Oui', 'Oui', 'Oui', 'Oui']],
        ['Visibilité', ['—', 'Promotion payante', 'Promotion payante', 'Promotion payante']],
      ];
  const copy = english ? {
    offers: 'Our plans',
    title: 'Simple plans to grow your artisan business.',
    subtitle: 'No large budget needed: from 1,000 XAF, feature a listing and measure customer interest.',
    distinction: t('premium_quality_distinction'),
    costTitle: 'Receiving customer requests stays free.',
    costDescription: 'Receiving customer requests is free. ArtisanConnect charges for paid visibility options and a 5% commission only when a transaction is actually collected through the platform.',
    recommended: t('pricing_recommended_plan'),
    days: 'days',
    month: 'month',
    adapted: 'An offer adapted to your activity.',
    create: 'Create my shop',
    choose: 'Choose',
    compare: 'Compare plans',
    feature: 'Feature',
    faq: 'Frequently asked questions',
    question1: 'Do I have to pay to receive requests?', answer1: 'No. You can receive quote requests with the Starter plan. Paid plans mainly buy more visibility and promotion tools.',
    question2: 'How is payment made?', answer2: 'Mobile Money subscription flows are currently sandbox/mock for pilot testing; do not treat a test confirmation as a real payment. Check the notice in the payment flow.',
    question3: 'What happens if I change plans?', answer3: 'Your plan is replaced and the new validity period is calculated from the payment made.',
    question4: 'Is there a commission on sales?', answer4: 'Yes. A 5% commission applies only to payments actually collected by ArtisanConnect, regardless of the subscription plan. No commission applies to direct cash payments. Test or sandbox payments are not real collections.',
    findTitle: 'Looking for an artisan?', findText: 'For clients, everything is free: searching, quote requests and connecting with artisans.', find: 'Find an artisan', quote: 'Request a quote',
  } : {
    offers: 'Nos offres',
    title: 'Des offres simples pour développer votre activité artisanale.',
    subtitle: 'Pas besoin de gros budget : à partir de 1 000 FCFA, mettez une annonce en avant et mesurez l’intérêt des clients.',
    distinction: t('premium_quality_distinction'),
    costTitle: 'Recevoir des clients reste gratuit.',
    costDescription: 'ArtisanConnect facture uniquement les options de visibilité payantes. Une commission de 5 % s’applique uniquement lorsqu’une transaction est réellement encaissée sur la plateforme.',
    recommended: t('pricing_recommended_plan'),
    days: 'jours',
    month: 'mois',
    adapted: 'Offre adaptée à votre activité.',
    create: 'Créer ma boutique',
    choose: 'Choisir',
    compare: 'Comparer les offres',
    feature: 'Fonctionnalité',
    faq: 'Questions fréquentes',
    question1: 'Dois-je payer pour recevoir des demandes ?', answer1: 'Non. Les demandes de devis peuvent être reçues même avec le plan Starter. Les plans payants achètent surtout davantage de visibilité et d’outils de mise en avant.',
    question2: 'Comment se fait le paiement ?', answer2: 'Les parcours Mobile Money des abonnements sont actuellement en sandbox/mock pour les tests du pilote. Une confirmation de test ne correspond pas à un paiement réel; lisez l’avertissement affiché dans le parcours.',
    question3: 'Que se passe-t-il si je change de plan ?', answer3: 'Votre plan est remplacé et la nouvelle validité est recalculée selon le paiement effectué.',
    question4: 'Y a-t-il une commission sur les ventes ?', answer4: 'Oui. Une commission de 5 % s’applique uniquement aux paiements réellement encaissés par ArtisanConnect, quel que soit le plan d’abonnement. Aucune commission ne s’applique aux paiements directs en espèces. Les paiements de test ou en sandbox ne sont pas des encaissements réels.',
    findTitle: 'Vous cherchez plutôt un artisan ?', findText: 'Côté client, tout est gratuit : recherche, demandes de devis et mise en relation.', find: 'Trouver un artisan', quote: 'Demander un devis',
  };

  return (
    <div className="space-y-10">
      <header className="rounded-xl bg-stone-900 px-6 py-10 text-white lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{copy.offers}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-stone-200">{copy.subtitle}</p>
        <p className="mt-3 max-w-3xl border-l-2 border-amber-400 pl-3 text-sm text-stone-300">{copy.distinction}</p>
      </header>
      <section className={`grid gap-6 ${plans.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {plans.map((plan) => {
          const localized = english ? ENGLISH_PLANS[plan.slug] : null;
          const isRecommended = recommendedPlan?.id === plan.id;
          const isFree = Number(plan.price) === 0;
          return (
            <article key={plan.id} className={`flex flex-col rounded-xl border p-6 ${isRecommended ? 'border-amber-600 bg-amber-50/60 shadow-sm' : 'border-stone-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium uppercase tracking-wide text-stone-500">{localized?.name ?? plan.name}</p>{isRecommended ? <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-semibold text-white">{copy.recommended}</span> : null}</div>
              <p className="mt-3 text-3xl font-semibold text-stone-900">{isFree ? '0 FCFA' : formatXAF(Number(plan.price))}{!isFree ? <span className="text-base font-normal text-stone-600"> / {plan.durationDays === 7 ? `7 ${copy.days}` : copy.month}</span> : null}</p>
              <p className="mt-2 text-sm text-stone-600">{localized?.description ?? (plan.description || copy.adapted)}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-700">{(localized?.features ?? plan.features).map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden className="text-emerald-600">✔</span><span>{feature}</span></li>)}</ul>
              <Link onClick={() => trackEvent('plan_cta_clicked', { label: plan.slug, targetId: plan.id })} href={isFree ? '/register' : `/payment?type=subscription&plan=${encodeURIComponent(plan.id)}`} className={`mt-6 rounded-md px-5 py-3 text-center text-sm font-semibold transition ${isRecommended ? 'bg-amber-700 text-white hover:bg-amber-800' : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}`}>{isFree ? copy.create : `${copy.choose} ${localized?.name ?? plan.name}`}</Link>
            </article>
          );
        })}
      </section>
      <section className="border-y border-emerald-200 bg-emerald-50/70 px-5 py-5">
        <h2 className="text-lg font-semibold text-emerald-950">{copy.costTitle}</h2>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-emerald-900">{copy.costDescription}</p>
      </section>
      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><h2 className="border-b border-stone-200 p-6 text-xl font-semibold text-stone-900">{copy.compare}</h2><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th scope="col" className="px-6 py-3">{copy.feature}</th>{plans.map((plan) => <th key={plan.id} scope="col" className="px-6 py-3">{english ? ENGLISH_PLANS[plan.slug]?.name ?? plan.name : plan.name}</th>)}</tr></thead><tbody>{comparisonRows.map(([feature, values]) => <tr key={feature} className="border-t border-stone-100"><th scope="row" className="px-6 py-3 font-medium text-stone-800">{feature}</th>{values.map((value, index) => <td key={`${feature}-${plans[index]?.id ?? index}`} className="px-6 py-3 text-stone-600">{value}</td>)}</tr>)}</tbody></table></section>
      <section className="space-y-4"><h2 className="text-xl font-semibold text-stone-900">{copy.faq}</h2><div className="grid gap-4 md:grid-cols-2">{[[copy.question1, copy.answer1], [copy.question2, copy.answer2], [copy.question3, copy.answer3], [copy.question4, copy.answer4]].map(([question, answer]) => <article key={question} className="rounded-lg border border-stone-200 bg-white p-5"><h3 className="font-semibold text-stone-900">{question}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{answer}</p></article>)}</div></section>
      <section className="rounded-xl bg-amber-50 p-6 text-center lg:p-10"><h2 className="text-2xl font-semibold text-stone-900">{copy.findTitle}</h2><p className="mx-auto mt-2 max-w-2xl text-stone-700">{copy.findText}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/trouver-un-artisan" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">{copy.find}</Link><Link href="/customer-requests" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">{copy.quote}</Link></div></section>
    </div>
  );
}

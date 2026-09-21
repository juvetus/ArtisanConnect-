'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { formatXAF } from '@/lib/format';

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
  starter: { name: 'Starter', description: 'Start without risk and test your first requests.', features: ['Artisan profile', '3 active listings', 'Receive quote requests', 'Messaging and WhatsApp'] },
  'visibilite-7': { name: 'Visibility 7 days', description: 'Test visibility with the price of a small boost.', features: ['Everything in Starter', '1 featured listing for 7 days', 'Local visibility badge'] },
  'local-plus': { name: 'Local Plus', description: 'The best starting point to stay visible all month.', features: ['Everything in Starter', 'Unlimited listings', '2 featured listings for 7 days', 'Local priority'] },
  croissance: { name: 'Growth', description: 'For artisans who publish often and want to track activity.', features: ['Everything in Local Plus', '3 featured listings for 15 days', 'Basic statistics', 'Priority support'] },
  'premium-growth': { name: 'Premium Growth', description: 'Accelerate your growth and boost your activity.', features: ['Everything in Local Plus', 'Premium Growth badge', '5 featured listings for 30 days', 'Service video gallery', 'Detailed statistics and priority support'] },
};

export function PricingContent({ plans }: { plans: PricingPlan[] }) {
  const { language } = useLanguage();
  const english = language === 'en';
  const recommendedPlan = plans.find((plan) => plan.slug === 'local-plus') ?? plans[1] ?? plans[0];
  const comparisonRows: ReadonlyArray<readonly [string, readonly string[]]> = english
    ? [
        ['Online shop', ['Included', 'Included', 'Included', 'Included', 'Included']],
        ['Active listings', ['Up to 3', 'Up to 3', 'Unlimited', 'Unlimited', 'Unlimited']],
        ['Featured listings', ['Standard', '1 listing / 7 days', '2 listings / 7 days', '3 listings / 15 days', '5 listings / 30 days']],
        ['Quote requests', ['Yes', 'Yes', 'Yes', 'Yes, prioritized', 'Yes, priority']],
        ['Badge', ['—', 'Local visibility', '—', '—', 'Premium Growth']],
        ['Video gallery', ['—', '—', '—', '—', 'Yes']],
        ['Statistics', ['Basic', 'Basic', 'Basic', 'Basic', 'Detailed']],
      ]
    : [
        ['Boutique en ligne', ['Incluse', 'Incluse', 'Incluse', 'Incluse', 'Incluse']],
        ['Annonces actives', ['Jusqu’à 3', 'Jusqu’à 3', 'Illimitées', 'Illimitées', 'Illimitées']],
        ['Mise en avant', ['Standard', '1 annonce / 7 jours', '2 annonces / 7 jours', '3 annonces / 15 jours', '5 annonces / 30 jours']],
        ['Demandes de devis', ['Oui', 'Oui', 'Oui', 'Oui, priorisées', 'Oui, prioritaires']],
        ['Badge', ['—', 'Visibilité locale', '—', '—', 'Premium Growth']],
        ['Galerie vidéo', ['—', '—', '—', '—', 'Oui']],
        ['Statistiques', ['Base', 'Base', 'Base', 'Base', 'Détaillées']],
      ];
  const copy = english ? {
    offers: 'Our plans',
    title: 'Start small, test for 7 days, then choose the plan that fits your activity.',
    subtitle: 'No large budget needed: from 1,000 XAF, feature a listing and measure customer interest.',
    recommended: '★ Recommended',
    days: 'days',
    adapted: 'An offer adapted to your activity.',
    create: 'Create my shop',
    choose: 'Choose',
    compare: 'Compare plans',
    feature: 'Feature',
    faq: 'Frequently asked questions',
    question1: 'Do I have to pay to receive requests?', answer1: 'No. You can receive quote requests with the Starter plan. Paid plans mainly increase visibility and response speed.',
    question2: 'How is payment made?', answer2: 'Payment is made by Mobile Money from your artisan account, according to the selected plan and validity period.',
    question3: 'What happens if I change plans?', answer3: 'Your plan is replaced and the new validity period is calculated from the payment made.',
    question4: 'Is there a commission on sales?', answer4: 'Yes, 5% on orders paid through the platform, regardless of the selected plan.',
    findTitle: 'Looking for an artisan?', findText: 'For clients, everything is free: searching, quote requests and connecting with artisans.', find: 'Find an artisan', quote: 'Request a quote',
  } : {
    offers: 'Nos offres',
    title: 'Commencez petit, testez pendant 7 jours, puis choisissez l’offre qui correspond à votre activité.',
    subtitle: 'Pas besoin de gros budget : à partir de 1 000 FCFA, mettez une annonce en avant et mesurez l’intérêt des clients.',
    recommended: '★ Recommandé',
    days: 'jours',
    adapted: 'Offre adaptée à votre activité.',
    create: 'Créer ma boutique',
    choose: 'Choisir',
    compare: 'Comparer les offres',
    feature: 'Fonctionnalité',
    faq: 'Questions fréquentes',
    question1: 'Dois-je payer pour recevoir des demandes ?', answer1: 'Non. Les demandes de devis peuvent être reçues même avec le plan Starter. Le plan payant sert surtout à gagner plus de visibilité et de rapidité.',
    question2: 'Comment se fait le paiement ?', answer2: 'Le paiement s’effectue par Mobile Money depuis votre espace artisan, selon le plan choisi et la durée de validité.',
    question3: 'Que se passe-t-il si je change de plan ?', answer3: 'Votre plan est remplacé et la nouvelle validité est recalculée selon le paiement effectué.',
    question4: 'Y a-t-il une commission sur les ventes ?', answer4: 'Oui, 5 % sur les commandes payées via la plateforme, quel que soit le plan choisi.',
    findTitle: 'Vous cherchez plutôt un artisan ?', findText: 'Côté client, tout est gratuit : recherche, demandes de devis et mise en relation.', find: 'Trouver un artisan', quote: 'Demander un devis',
  };

  return (
    <div className="space-y-10">
      <header className="rounded-xl bg-stone-900 px-6 py-10 text-white lg:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-300">{copy.offers}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight md:text-4xl">{copy.title}</h1>
        <p className="mt-4 max-w-2xl text-stone-200">{copy.subtitle}</p>
      </header>
      <section className={`grid gap-6 ${plans.length > 3 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {plans.map((plan) => {
          const localized = english ? ENGLISH_PLANS[plan.slug] : null;
          const isRecommended = recommendedPlan?.id === plan.id;
          const isFree = Number(plan.price) === 0;
          return (
            <article key={plan.id} className={`flex flex-col rounded-xl border p-6 ${isRecommended ? 'border-amber-600 bg-amber-50/60 shadow-sm' : 'border-stone-200 bg-white'}`}>
              <div className="flex items-center justify-between gap-3"><p className="text-sm font-medium uppercase tracking-wide text-stone-500">{localized?.name ?? plan.name}</p>{isRecommended ? <span className="rounded-full bg-amber-700 px-2.5 py-0.5 text-xs font-semibold text-white">{copy.recommended}</span> : null}</div>
              <p className="mt-3 text-3xl font-semibold text-stone-900">{isFree ? '0 FCFA' : formatXAF(Number(plan.price))}{!isFree ? <span className="text-base font-normal text-stone-600"> / {plan.durationDays} {copy.days}</span> : null}</p>
              <p className="mt-2 text-sm text-stone-600">{localized?.description ?? (plan.description || copy.adapted)}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-stone-700">{(localized?.features ?? plan.features).map((feature) => <li key={feature} className="flex gap-2"><span aria-hidden className="text-emerald-600">✔</span><span>{feature}</span></li>)}</ul>
              <Link href={isFree ? '/register' : `/payment?type=subscription&plan=${encodeURIComponent(plan.id)}`} className={`mt-6 rounded-md px-5 py-3 text-center text-sm font-semibold transition ${isRecommended ? 'bg-amber-700 text-white hover:bg-amber-800' : 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50'}`}>{isFree ? copy.create : `${copy.choose} ${localized?.name ?? plan.name}`}</Link>
            </article>
          );
        })}
      </section>
      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white"><h2 className="border-b border-stone-200 p-6 text-xl font-semibold text-stone-900">{copy.compare}</h2><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th scope="col" className="px-6 py-3">{copy.feature}</th>{plans.map((plan) => <th key={plan.id} scope="col" className="px-6 py-3">{english ? ENGLISH_PLANS[plan.slug]?.name ?? plan.name : plan.name}</th>)}</tr></thead><tbody>{comparisonRows.map(([feature, values]) => <tr key={feature} className="border-t border-stone-100"><th scope="row" className="px-6 py-3 font-medium text-stone-800">{feature}</th>{values.map((value, index) => <td key={`${feature}-${plans[index]?.id ?? index}`} className="px-6 py-3 text-stone-600">{value}</td>)}</tr>)}</tbody></table></section>
      <section className="space-y-4"><h2 className="text-xl font-semibold text-stone-900">{copy.faq}</h2><div className="grid gap-4 md:grid-cols-2">{[[copy.question1, copy.answer1], [copy.question2, copy.answer2], [copy.question3, copy.answer3], [copy.question4, copy.answer4]].map(([question, answer]) => <article key={question} className="rounded-lg border border-stone-200 bg-white p-5"><h3 className="font-semibold text-stone-900">{question}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{answer}</p></article>)}</div></section>
      <section className="rounded-xl bg-amber-50 p-6 text-center lg:p-10"><h2 className="text-2xl font-semibold text-stone-900">{copy.findTitle}</h2><p className="mx-auto mt-2 max-w-2xl text-stone-700">{copy.findText}</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Link href="/trouver-un-artisan" className="rounded-lg bg-stone-900 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800">{copy.find}</Link><Link href="/customer-requests" className="rounded-lg border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-800 hover:bg-stone-50">{copy.quote}</Link></div></section>
    </div>
  );
}

import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { PricingContent, type PricingPlan } from './PricingContent';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const metadata: Metadata = {
  title: 'Tarifs ArtisanConnect | Starter, Local Plus et Premium Growth',
  description: 'Créez votre boutique gratuitement au Cameroun et choisissez une offre adaptée à votre activité.',
  alternates: { canonical: `${siteUrl}/tarifs` },
  openGraph: { title: 'Tarifs ArtisanConnect', url: `${siteUrl}/tarifs`, type: 'website' },
};

const FALLBACK_PLANS: PricingPlan[] = [
  { id: 'starter', slug: 'starter', name: 'Starter', price: 0, currency: 'XAF', durationDays: 30, description: 'Pour commencer sans risque et tester les premières demandes.', features: ['Profil artisan', '3 annonces actives', 'Réception de demandes de devis', 'Messagerie et WhatsApp'], sortOrder: 1 },
  { id: 'visibilite-7', slug: 'visibilite-7', name: 'Visibilité 7 jours', price: 1000, currency: 'XAF', durationDays: 7, description: 'Pour tester la visibilité avec le prix d’un petit coup de pouce.', features: ['Tout le plan Starter', '1 annonce mise en avant pendant 7 jours', 'Badge de visibilité locale'], sortOrder: 2 },
  { id: 'local-plus', slug: 'local-plus', name: 'Local Plus', price: 3000, currency: 'XAF', durationDays: 30, description: 'Le meilleur point de départ pour être visible tout le mois.', features: ['Tout le plan Starter', 'Annonces illimitées', '2 annonces mises en avant pendant 7 jours', 'Priorité locale'], sortOrder: 3 },
  { id: 'croissance', slug: 'croissance', name: 'Croissance', price: 5000, currency: 'XAF', durationDays: 30, description: 'Pour les artisans qui publient souvent et veulent suivre leur activité.', features: ['Tout le plan Local Plus', '3 annonces mises en avant pendant 15 jours', 'Statistiques de base', 'Support prioritaire'], sortOrder: 4 },
  { id: 'premium-growth', slug: 'premium-growth', name: 'Premium Growth', price: 10000, currency: 'XAF', durationDays: 30, description: 'Pour accélérer votre croissance et booster votre activité.', features: ['Tout le plan Local Plus', 'Badge Premium Growth', '5 annonces mises en avant pendant 30 jours', 'Galerie vidéo des services', 'Statistiques détaillées et support prioritaire'], sortOrder: 5 },
];

export default async function PricingPage() {
  let plans = FALLBACK_PLANS;
  try {
    const remotePlans = await api.getSubscriptionPlans();
    if (remotePlans.length) {
      plans = remotePlans.map((plan) => {
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
          features: plan.features?.length ? [...plan.features] : fallback?.features ?? ['Profil artisan', 'Visibilité locale'],
          sortOrder: Number(plan.sortOrder ?? fallback?.sortOrder ?? 0),
        };
      }).sort((a, b) => a.sortOrder - b.sortOrder);
    }
  } catch {
    // Use local fallback offers if the API is unavailable.
  }

  return <PricingContent plans={plans} />;
}

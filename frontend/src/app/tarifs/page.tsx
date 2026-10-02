import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { PricingContent, type PricingPlan } from './PricingContent';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const metadata: Metadata = {
  title: 'Tarifs ArtisanConnect | Gratuit, Pro, Premium et Boost',
  description: 'Créez votre boutique gratuitement au Cameroun et choisissez une offre adaptée à votre activité.',
  alternates: { canonical: `${siteUrl}/tarifs` },
  openGraph: { title: 'Tarifs ArtisanConnect', url: `${siteUrl}/tarifs`, type: 'website' },
};

const FALLBACK_PLANS: PricingPlan[] = [
  { id: 'starter', slug: 'starter', name: 'Gratuit', price: 0, currency: 'XAF', durationDays: 30, description: 'Recevez des demandes de devis et démarrez votre activité sans frais.', features: ['Profil artisan', '3 annonces actives', 'Réception de demandes de devis', 'Messagerie et WhatsApp'], sortOrder: 1 },
  { id: 'local-plus', slug: 'local-plus', name: 'Pro', price: 3000, currency: 'XAF', durationDays: 30, description: 'Pour développer votre présence et mettre vos offres en avant.', features: ['Tout le plan Gratuit', 'Annonces illimitées', '2 annonces mises en avant pendant 7 jours', 'Priorité locale'], sortOrder: 2 },
  { id: 'premium-growth', slug: 'premium-growth', name: 'Premium', price: 10000, currency: 'XAF', durationDays: 30, description: 'Pour renforcer votre visibilité et développer votre activité.', features: ['Tout le plan Pro', '5 annonces mises en avant pendant 30 jours'], sortOrder: 3 },
  { id: 'visibilite-7', slug: 'visibilite-7', name: 'Boost', price: 1000, currency: 'XAF', durationDays: 7, description: 'Une mise en avant ponctuelle pendant 7 jours.', features: ['Tout le plan Gratuit', '1 annonce mise en avant pendant 7 jours'], sortOrder: 4 },
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

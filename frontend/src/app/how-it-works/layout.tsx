import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Votre projet, de la recherche à la réalisation | ArtisanConnect',
  description:
    'Décrivez votre besoin, comparez les artisans, recevez un devis, suivez la prestation et partagez votre avis sur ArtisanConnect.',
  keywords: [
    'où trouver artisans Cameroun',
    'plateforme pour artisans au Cameroun',
    'acheter artisanat camerounais en ligne',
    'plateforme artisans Cameroun',
  ],
  alternates: { canonical: '/how-it-works' },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
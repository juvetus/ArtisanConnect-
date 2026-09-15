import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Comment trouver un artisan au Cameroun | ArtisanConnect',
  description:
    'Découvrez comment acheter des produits artisanaux et réserver un service auprès d’artisans camerounais sur ArtisanConnect.',
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
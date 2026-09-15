import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Boutique artisanale Cameroun | Créations locales',
  description:
    'Découvrez la boutique d’un artisan camerounais, ses produits faits main, ses créations locales et ses avis clients sur ArtisanConnect.',
  keywords: [
    'artisans Cameroun',
    'produits artisanaux Cameroun',
    'artisanat fait main Cameroun',
    'créatrices locales Cameroun',
    'coopératives artisanales Cameroun',
  ],
};

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return children;
}
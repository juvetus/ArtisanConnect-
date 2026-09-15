import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Produit artisanal camerounais | Acheter en ligne',
  description:
    'Découvrez cette annonce sur ArtisanConnect et achetez un produit artisanal auprès d’un artisan ou vendeur au Cameroun.',
  keywords: ['produits artisanaux Cameroun', 'acheter produits artisanaux', 'artisanat fait main Cameroun'],
};

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
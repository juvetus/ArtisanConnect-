import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Acheter produits artisanaux Cameroun | Clients ArtisanConnect',
  description: 'Découvrez où acheter des produits artisanaux camerounais en ligne, comparez les offres et contactez directement les artisans sur ArtisanConnect.',
  keywords: ['acheter produits artisanaux', 'produits artisanaux Cameroun', 'acheter artisanat camerounais en ligne', 'artisanat fait main Cameroun'],
  alternates: { canonical: '/clients' },
};

export default function ClientsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
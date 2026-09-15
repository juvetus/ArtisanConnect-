import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Vendre produits artisanaux Cameroun | Artisans et vendeurs',
  description: 'Créez votre boutique, vendez vos produits artisanaux et proposez vos services en ligne aux clients du Cameroun avec ArtisanConnect.',
  keywords: ['vendre artisanat en ligne Cameroun', 'artisans Cameroun', 'produits artisanaux Cameroun', 'plateforme pour artisans au Cameroun'],
  alternates: { canonical: '/artisans' },
};

export default function ArtisansLayout({ children }: { children: React.ReactNode }) {
  return children;
}
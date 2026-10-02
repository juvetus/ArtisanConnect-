import type { Metadata } from 'next';
import { BlogIndexContent } from '@/components/BlogIndexContent';

export const metadata: Metadata = {
  title: 'Artisanat au Cameroun | Guides pour clients et artisans',
  description: 'Conseils pratiques pour acheter de l’artisanat local, comparer les offres, vendre en ligne et développer une activité artisanale au Cameroun.',
  keywords: [
    'artisanat Cameroun',
    'artisans Cameroun',
    'conseils artisanat Cameroun',
    'produits artisanaux Cameroun',
    'coopératives artisanales Cameroun',
    'acheter artisanat camerounais en ligne',
  ],
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return <BlogIndexContent />;
}
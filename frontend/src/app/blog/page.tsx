import type { Metadata } from 'next';
import { BlogIndexContent } from '@/components/BlogIndexContent';

export const metadata: Metadata = {
  title: 'Blog artisanat Cameroun | Conseils pour artisans et clients',
  description: 'Conseils et ressources sur l’artisanat au Cameroun : acheter local, vendre en ligne, développer son activité et soutenir les coopératives artisanales.',
  keywords: [
    'artisanat Cameroun',
    'artisans Cameroun',
    'produits artisanaux Cameroun',
    'coopératives artisanales Cameroun',
    'acheter artisanat camerounais en ligne',
  ],
  alternates: { canonical: '/blog' },
};

export default function BlogPage() {
  return <BlogIndexContent />;
}
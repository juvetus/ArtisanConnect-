import type { Metadata } from 'next';
import { BlogIndexContent } from '@/components/BlogIndexContent';

export const metadata: Metadata = {
  title: 'Blog | ArtisanConnect',
  description: 'Conseils, histoires et ressources pour les artisans, clients et coopératives du Cameroun.',
};

export default function BlogPage() {
  return <BlogIndexContent />;
}
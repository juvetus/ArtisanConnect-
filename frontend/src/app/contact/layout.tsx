import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact artisans Cameroun | Support ArtisanConnect',
  description:
    'Contactez ArtisanConnect pour trouver un artisan au Cameroun, obtenir de l’aide ou poser une question sur une commande, un vendeur ou un service.',
  keywords: [
    'contact artisans Cameroun',
    'contacter artisan Cameroun',
    'support ArtisanConnect',
    'aide artisans Cameroun',
    'contact marketplace Cameroun',
  ],
  alternates: { canonical: '/contact' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
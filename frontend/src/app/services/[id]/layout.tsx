import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service artisan Cameroun | Demander un devis',
  description:
    'Demandez un service artisanal au Cameroun : couture, menuiserie, plomberie, électricité et prestations sur mesure.',
  keywords: ['services artisans Cameroun', 'artisan Cameroun', 'services artisanaux en ligne Cameroun'],
};

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services artisans Cameroun | Trouver un artisan',
  description:
    'Trouvez des services artisans au Cameroun : couture sur mesure, menuiserie, plomberie, électricité et organisation d’événements.',
  keywords: [
    'services artisans Cameroun',
    'couture sur mesure Cameroun',
    'menuiserie Cameroun',
    'plomberie Cameroun',
    'électricien Cameroun',
    'organisation d’événements Cameroun',
    'services artisanaux en ligne Cameroun',
  ],
  alternates: { canonical: '/services' },
};

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
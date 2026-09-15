import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Partenariat institutions artisanat Cameroun | ArtisanConnect',
  description:
    'Découvrez comment les institutions, ONG et programmes de développement peuvent accompagner les artisans du Cameroun, publier leurs programmes et mesurer leur impact avec ArtisanConnect.',
  keywords: [
    'institutions artisanat Cameroun',
    'accompagnement artisans Cameroun',
    'programmes artisanat Cameroun',
    'coopératives artisanales Cameroun',
    'plateforme artisans Cameroun',
  ],
  alternates: { canonical: '/institutions' },
};

export default function InstitutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
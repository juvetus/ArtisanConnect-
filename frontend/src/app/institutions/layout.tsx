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
  openGraph: {
    type: 'website',
    title: 'Partenariat institutions artisanat Cameroun | ArtisanConnect',
    description: 'ArtisanConnect aide les institutions et partenaires de développement à accompagner les artisans camerounais et à mesurer leur impact.',
    images: [{ url: '/images/partenaire.png', width: 1536, height: 1024, alt: 'Partenariat entre institutions et artisans camerounais' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Partenariat institutions artisanat Cameroun | ArtisanConnect',
    description: 'Accompagnez les artisans camerounais et mesurez l’impact de vos programmes avec ArtisanConnect.',
    images: ['/images/partenaire.png'],
  },
};

export default function InstitutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
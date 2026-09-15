import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { Header } from "@/components/Header";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { Footer } from "@/components/Footer";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { WhatsAppFloatingButton } from "@/components/WhatsAppFloatingButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';
const siteName = 'ArtisanConnect';
const siteDescription =
  'Marketplace artisanale au Cameroun : trouvez des artisans, achetez des produits artisanaux et demandez des services locaux en ligne.';
const siteKeywords = [
  'marketplace artisanale Cameroun',
  'artisans Cameroun',
  'produits artisanaux Cameroun',
  'services artisans Cameroun',
  'artisanat Cameroun',
  'acheter produits artisanaux',
  'plateforme artisans Cameroun',
  'acheter artisanat camerounais en ligne',
  'services artisanaux en ligne Cameroun',
];

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Marketplace artisanale Cameroun | ArtisanConnect',
    template: "%s | ArtisanConnect",
  },
  description: siteDescription,
  keywords: siteKeywords,
  applicationName: siteName,
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  category: 'shopping',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'ArtisanConnect',
    statusBarStyle: 'default',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CM',
    url: siteUrl,
    siteName,
    title: 'Marketplace artisanale Cameroun | ArtisanConnect',
    description: siteDescription,
    images: [{ url: '/images/hero-artisan.jpg', width: 1200, height: 630, alt: 'Artisan camerounais dans son atelier' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marketplace artisanale Cameroun | ArtisanConnect',
    description: siteDescription,
    images: ['/images/hero-artisan.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#92400e',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: siteName,
        url: siteUrl,
        logo: `${siteUrl}/icons/icon-512.png`,
        areaServed: { '@type': 'Country', name: 'Cameroun' },
        description: siteDescription,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        name: siteName,
        url: siteUrl,
        inLanguage: 'fr-CM',
        publisher: { '@id': `${siteUrl}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${siteUrl}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  };

  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <ServiceWorkerRegistration />
        <LanguageProvider>
          <AuthProvider>
            <Header />
            <EmailVerificationBanner />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
            <Footer />
            <WhatsAppFloatingButton />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

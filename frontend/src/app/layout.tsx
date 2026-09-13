import type { Metadata } from "next";
import { Geist } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { LanguageProvider } from "@/lib/language-context";
import { Header } from "@/components/Header";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { Footer } from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ArtisanConnect — la place de marché des artisans",
    template: "%s | ArtisanConnect",
  },
  description:
    "Découvrez, commandez et échangez avec des artisans, créateurs, boutiques et prestataires locaux au Cameroun.",
  applicationName: 'ArtisanConnect',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_CM',
    url: siteUrl,
    siteName: 'ArtisanConnect',
    title: "ArtisanConnect — la place de marché des artisans",
    description: "La plateforme camerounaise pour découvrir, commander et soutenir les artisans locaux.",
    images: [{ url: '/images/hero-artisan.jpg', width: 1200, height: 630, alt: 'Artisan camerounais dans son atelier' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "ArtisanConnect — la place de marché des artisans",
    description: "Découvrez et commandez auprès des artisans locaux au Cameroun.",
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <LanguageProvider>
          <AuthProvider>
            <Header />
            <EmailVerificationBanner />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}

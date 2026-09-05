import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Header } from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ArtisanConnect — la place de marché des artisans",
  description:
    "Découvrez et commandez des créations et services d'artisans locaux, paiement en espèces à la remise.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <AuthProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
          <footer className="border-t border-stone-200 bg-white py-6 text-center text-sm text-stone-500">
            ArtisanConnect — Phase 1 (paiement en espèces à la remise)
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}

'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-screen-2xl gap-6 px-6 py-8 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="text-lg font-semibold text-white">
            Artisan<span className="text-amber-400">Connect</span> —
          </p>
          <p className="mt-2 text-sm">{t('footer_tagline')}</p>
        </div>
        <div>
          <p className="font-medium text-white">{t('footer_clients')}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/trouver-un-artisan" className="hover:text-white">{t('nav_find_artisan')}</Link>
            <Link href="/customer-requests" className="hover:text-white">{t('home_cta_quote')}</Link>
            <Link href="/annonces" className="hover:text-white">{t('footer_buy_local')}</Link>
            <Link href="/how-it-works" className="hover:text-white">{t('nav_how_it_works')}</Link>
          </div>
        </div>
        <div>
          <p className="font-medium text-white">{t('footer_artisans')}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/register?role=artisan" className="hover:text-white">{t('nav_create_shop')}</Link>
            <Link href="/tarifs" className="hover:text-white">{t('footer_pricing')}</Link>
            <Link href="/artisans" className="hover:text-white">{t('footer_artisan_guide')}</Link>
            <Link href="/login" className="hover:text-white">{t('nav_login')}</Link>
          </div>
        </div>
        <div>
          <p className="font-medium text-white">{t('footer_organizations')}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/institutions" className="hover:text-white">{t('nav_institutions')}</Link>
            <Link href="/contact?topic=partnership" className="hover:text-white">{t('footer_partnerships')}</Link>
            <Link href="/contact" className="hover:text-white">{t('nav_contact')}</Link>
          </div>
        </div>
        <div>
          <p className="font-medium text-white">{t('footer_legal_short')}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/mentions-legales" className="hover:text-white">{t('footer_legal_notice')}</Link>
            <Link href="/confidentialite" className="hover:text-white">{t('footer_privacy')}</Link>
            <Link href="/conditions" className="hover:text-white">{t('footer_terms')}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-700 px-6 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} ArtisanConnect · {t('footer_rights')}
      </div>
    </footer>
  );
}

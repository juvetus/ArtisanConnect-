'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';

export function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-stone-200 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-screen-2xl gap-6 px-6 py-8 sm:grid-cols-3">
        <div>
          <p className="text-lg font-semibold text-white">
            Artisan<span className="text-amber-400">Connect</span>
          </p>
          <p className="mt-2 text-sm">{t('footer_tagline')}</p>
        </div>
        <div>
          <p className="font-medium text-white">{t('footer_explore')}</p>
          <div className="mt-2 flex flex-col gap-1 text-sm">
            <Link href="/services" className="hover:text-white">{t('nav_services')}</Link>
            <Link href="/" className="hover:text-white">{t('nav_listings')}</Link>
            <Link href="/how-it-works" className="hover:text-white">{t('nav_how_it_works')}</Link>
            <Link href="/institutions" className="hover:text-white">{t('nav_institutions')}</Link>
            <Link href="/contact" className="hover:text-white">{t('nav_contact')}</Link>
          </div>
        </div>
        <div>
          <p className="font-medium text-white">{t('footer_help')}</p>
          <p className="mt-2 text-sm">{t('footer_support_desc')}</p>
          <Link href="/contact" className="mt-2 inline-block text-sm text-amber-300 hover:text-amber-200">
            {t('footer_contact_support')}
          </Link>
        </div>
      </div>
      <div className="border-t border-stone-700 px-6 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} ArtisanConnect · {t('footer_rights')}
      </div>
    </footer>
  );
}

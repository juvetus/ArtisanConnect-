'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export function DirectoryNoResultsAction() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const english = language === 'en';

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-sm text-amber-950">
        {user?.role === 'institution'
          ? (english ? 'No artisan matches this search yet. Contact us to discuss a partnership.' : 'Aucun artisan ne correspond encore à cette recherche. Contactez-nous pour discuter d’un partenariat.')
          : (english ? 'No artisan matches this search yet.' : 'Aucun artisan ne correspond encore à cette recherche.')}
      </p>
      {ready && (!user || user.role === 'client') ? (
        <Link href="/customer-requests" className="inline-flex rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
          {english ? 'Request a quote' : 'Demander un devis'}
        </Link>
      ) : null}
      {user?.role === 'institution' ? (
        <Link href="/contact" className="inline-flex rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
          {english ? 'Contact ArtisanConnect' : 'Contacter ArtisanConnect'}
        </Link>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export function DirectoryNoResultsAction({ category, city, neighborhood, query }: {
  category?: string;
  city?: string;
  neighborhood?: string;
  query?: string;
}) {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const english = language === 'en';
  const requestParams = new URLSearchParams();
  const requestedTrade = category || query;
  if (requestedTrade) requestParams.set('category', requestedTrade);
  if (city) requestParams.set('city', city);
  if (neighborhood) requestParams.set('neighborhood', neighborhood);
  const requestHref = `/customer-requests${requestParams.size ? `?${requestParams}` : ''}`;

  return (
    <div className="space-y-3 border-y border-amber-200 bg-amber-50/70 px-5 py-5">
      <h2 className="text-lg font-semibold text-amber-950">{english ? 'Can’t find the artisan you need? We’ll look for one.' : 'Artisan introuvable ? Nous cherchons pour vous.'}</h2>
      <p className="text-sm leading-6 text-amber-950">
        {user?.role === 'institution'
          ? (english ? 'Contact us to discuss a programme or partnership for this need.' : 'Contactez-nous pour parler d’un programme ou d’un partenariat autour de ce besoin.')
          : (english ? 'Describe the project and area. We’ll save the request and notify suitable artisans as they join.' : 'Décrivez le projet et la zone. Nous enregistrerons la demande et préviendrons les artisans compatibles lorsqu’ils rejoindront la plateforme.')}
        {requestedTrade ? <span className="mt-1 block font-medium">{english ? `Trade: ${requestedTrade}${city ? ` · ${city}` : ''}${neighborhood ? ` · ${neighborhood}` : ''}` : `Métier : ${requestedTrade}${city ? ` · ${city}` : ''}${neighborhood ? ` · ${neighborhood}` : ''}`}</span> : null}
      </p>
      {ready && (!user || user.role === 'client') ? (
        <Link href={requestHref} className="inline-flex rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
          {english ? 'Describe the need' : 'Décrire le besoin'}
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

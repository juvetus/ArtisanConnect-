'use client';

import { useLanguage } from '@/lib/language-context';
import { useAuth } from '@/lib/auth-context';

export function DirectoryIntro() {
  const { language } = useLanguage();
  const { user } = useAuth();
  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{language === 'en' ? 'Artisan directory' : 'Annuaire des artisans'}</p>
      <p className="mt-2 text-stone-600">{user?.role === 'institution'
        ? (language === 'en' ? 'Find local artisans and contact them directly about programs, training or partnership opportunities.' : 'Repérez les artisans locaux et contactez-les au sujet de programmes, formations ou partenariats.')
        : user?.role === 'artisan'
          ? (language === 'en' ? 'Explore artisan profiles, local skills and customer reviews.' : 'Consultez les profils, les savoir-faire locaux et les avis clients.')
          : (language === 'en' ? 'Compare profiles, read reviews and request a free quote in minutes.' : 'Comparez les profils, consultez les avis et demandez un devis gratuit en quelques minutes.')}</p>
    </>
  );
}

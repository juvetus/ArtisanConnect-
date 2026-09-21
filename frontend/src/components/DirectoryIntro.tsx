'use client';

import { useLanguage } from '@/lib/language-context';

export function DirectoryIntro() {
  const { language } = useLanguage();
  return (
    <>
      <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{language === 'en' ? 'Artisan directory' : 'Annuaire des artisans'}</p>
      <p className="mt-2 text-stone-600">{language === 'en' ? 'Compare profiles, read reviews and request a free quote in minutes.' : 'Comparez les profils, consultez les avis et demandez un devis gratuit en quelques minutes.'}</p>
    </>
  );
}

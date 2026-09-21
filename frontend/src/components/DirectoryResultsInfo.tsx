'use client';

import { useLanguage } from '@/lib/language-context';

export function DirectoryResultsInfo({ count }: { count: number }) {
  const { language } = useLanguage();
  return <p className="text-sm text-stone-600">{count} {count === 1 ? (language === 'en' ? 'artisan' : 'artisan') : (language === 'en' ? 'artisans' : 'artisans')} {language === 'en' ? 'match your search.' : 'correspondent à votre recherche.'}</p>;
}

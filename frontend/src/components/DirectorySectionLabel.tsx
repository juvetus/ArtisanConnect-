'use client';

import { useLanguage } from '@/lib/language-context';

export function DirectorySectionLabel({ kind }: { kind: 'neighborhood' | 'frequent' }) {
  const { language } = useLanguage();
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-700">{kind === 'neighborhood' ? (language === 'en' ? 'By neighborhood' : 'Par quartier') : (language === 'en' ? 'Popular searches' : 'Recherches fréquentes')}</h2>;
}

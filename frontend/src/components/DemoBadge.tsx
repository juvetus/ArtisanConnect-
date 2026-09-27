'use client';

import { useLanguage } from '@/lib/language-context';

/** Marque explicitement un contenu fictif pour ne pas le confondre avec une offre réelle. */
export function DemoBadge({ className = '' }: { className?: string }) {
  const { language } = useLanguage();
  const english = language === 'en';

  return (
    <span
      title={english ? 'Demo content, not a real offer' : 'Contenu de démonstration, pas une offre réelle'}
      className={`inline-flex items-center gap-1 rounded-full bg-stone-800/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white ${className}`}
    >
      {english ? 'Demo' : 'Démonstration'}
    </span>
  );
}

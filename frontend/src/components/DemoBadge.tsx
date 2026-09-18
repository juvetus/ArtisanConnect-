'use client';

/** Marque explicitement un contenu fictif : aucun visiteur ne doit le confondre avec un vrai artisan. */
export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Contenu de démonstration, utilisé le temps du pilote"
      className={`inline-flex items-center gap-1 rounded-full bg-stone-800/90 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white ${className}`}
    >
      Démonstration
    </span>
  );
}

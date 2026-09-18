'use client';

import { CollapsibleSection } from '@/components/CollapsibleSection';

type ShopReview = {
  id: string;
  rating: number;
  comment?: string | null;
  verified?: boolean;
  createdAt: string;
  reviewer?: { name?: string | null } | null;
};

export function ShopReviews({ reviews }: { reviews: ShopReview[] }) {
  return (
    <CollapsibleSection
      title="Avis sur l’artisan"
      subtitle={
        reviews.length
          ? `${reviews.length} avis de clients ayant terminé une commande`
          : 'Aucun avis pour le moment'
      }
    >
      {!reviews.length ? (
        <p className="text-sm text-stone-600">Aucun avis pour le moment.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="border-b border-stone-100 pb-3 last:border-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">
                  {'★'.repeat(review.rating)}
                  <span className="text-stone-300">{'★'.repeat(5 - review.rating)}</span>
                </p>
                {review.verified ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">✔ Avis vérifié</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-stone-700">{review.comment || 'Aucun commentaire'}</p>
              <p className="mt-1 text-xs text-stone-500">
                {review.reviewer?.name || 'Client'} · {new Date(review.createdAt).toLocaleDateString('fr-FR')}
              </p>
            </article>
          ))}
        </div>
      )}
    </CollapsibleSection>
  );
}

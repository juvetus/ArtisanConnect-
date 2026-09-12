import { notFound } from 'next/navigation';
import { api } from '@/lib/api';
import { formatXAF } from '@/lib/format';
import { categoryIcon, categoryLabel } from '@/lib/categories';
import { resolveMediaUrl } from '@/lib/media';

export default async function ShopPublicPage({ params }: { params: { id: string } }) {
  let data: { shop: any; listings: any[] } | null = null;
  let reviewsData: any = null;
  let ratingData: { average: number | null; count: number } = { average: null, count: 0 };
  try {
    data = await api.shopPublic(params.id);
    if (data?.shop?.sellerId) {
      [reviewsData, ratingData] = await Promise.all([
        api.getArtisanServiceReviews(data.shop.sellerId),
        api.getArtisanServiceRating(data.shop.sellerId),
      ]) as [any, { average: number | null; count: number }];
    }
  } catch {
    // do nothing; will handle with notFound
  }
  if (!data || !data.shop) return notFound();
  const { shop, listings } = data;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <section className="mb-8 rounded-lg border border-stone-200 bg-white p-6">
        <h1 className="text-2xl font-bold">{shop.name}</h1>
        <div className="mt-2 text-stone-700">{shop.description}</div>
        <div className="mt-4 text-sm text-stone-600">
          <span>Boutique {shop.type}</span>
          <span className="ml-3">{ratingData.average ? `★ ${ratingData.average}/5` : 'Pas encore noté'} ({ratingData.count} avis)</span>
          {shop.verifiedBadge && <span className="ml-2 text-emerald-600">✔ Vendeur vérifié</span>}
        </div>
      </section>
      <section className="mb-8 rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Avis sur l’artisan</h2>
        {!reviewsData?.[0]?.length ? <p className="text-sm text-stone-600">Aucun avis pour le moment.</p> : <div className="space-y-4">{reviewsData[0].map((review: any) => <article key={review.id} className="border-b border-stone-100 pb-3 last:border-0"><p className="font-medium">{'★'.repeat(review.rating)}<span className="text-stone-300">{'★'.repeat(5 - review.rating)}</span></p><p className="mt-1 text-sm text-stone-700">{review.comment || 'Aucun commentaire'}</p><p className="mt-1 text-xs text-stone-500">{review.reviewer?.name || 'Client'} · {new Date(review.createdAt).toLocaleDateString('fr-FR')}</p></article>)}</div>}
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">Annonces de la boutique</h2>
        {listings.length === 0 ? (
          <p className="rounded-lg border border-stone-200 bg-white p-6 text-stone-600">
            Cette boutique n'a pas encore publié d'annonce.
          </p>
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map(listing => (
              <li key={listing.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs">
                <div className="relative flex h-48 w-full items-center justify-center overflow-hidden bg-stone-100 text-3xl">
                  {listing.imageUrl ? (
                    <img
                      src={resolveMediaUrl(listing.imageUrl)}
                      alt={listing.title}
                      className="h-full w-full object-cover object-center"
                    />
                  ) : (
                    categoryIcon(listing.category, listing.type)
                  )}
                </div>
                <div className="p-4">
                  <div className="font-medium text-stone-900">{listing.title}</div>
                  <div className="mb-1 text-xs text-stone-500 uppercase tracking-wide">{categoryLabel(listing.category)}</div>
                  <div className="mt-2 font-semibold text-amber-700">{formatXAF(listing.price)}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

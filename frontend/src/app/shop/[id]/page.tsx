import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatXAF } from '@/lib/format';
import { categoryLabel } from '@/lib/categories';
import { resolveMediaUrl } from '@/lib/media';
import { whatsappHref } from '@/lib/whatsapp';
import { ShopPublicCard } from '@/components/ShopPublicCard';
import { ReportButton } from '@/components/ReportButton';

type ResponseHistory = {
  responsesSent: number;
  responseRate: number;
  averageResponseMinutes: number;
  lastResponseAt: string | null;
};

export default async function ShopPublicPage({ params }: { params: Promise<{ id: string }> }) {
  let data: { shop: any; listings: any[] } | null = null;
  let serviceReviews: any = null;
  let productReviews: any = null;
  let responseHistory: ResponseHistory | null = null;
  let ratingData: { average: number | null; count: number } = { average: null, count: 0 };
  try {
    const { id } = await params;
    const publicData = await api.shopPublic(id);
    data = Array.isArray(publicData) ? publicData[0] : publicData;
    if (data?.shop?.sellerId) {
      [serviceReviews, productReviews, ratingData, responseHistory] = await Promise.all([
        api.getArtisanServiceReviews(data.shop.sellerId),
        api.sellerReviews(data.shop.sellerId),
        api.getArtisanServiceRating(data.shop.sellerId),
        api.getArtisanResponseHistory(data.shop.sellerId),
      ]) as [any, any, { average: number | null; count: number }, ResponseHistory];
    }
  } catch {
    // do nothing; will handle with notFound
  }
  if (!data || !data.shop) return notFound();
  const { shop, listings } = data;
  const reviews: any[] = [...(serviceReviews?.[0] ?? []), ...(productReviews?.[0] ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const shopWhatsapp = whatsappHref(shop.seller?.whatsappPhone ?? shop.seller?.phone, `Bonjour ${shop.seller?.name ?? shop.name}, je souhaite découvrir vos créations sur ArtisanConnect.`);
  const shopUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info'}/shop/${shop.id}`;
  const shareShopWhatsapp = `https://wa.me/?text=${encodeURIComponent(`Découvrez la boutique « ${shop.name} » sur ArtisanConnect : ${shopUrl}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shopUrl)}`;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <ShopPublicCard
        shopId={shop.id}
        shopName={shop.name}
        description={shop.description}
        shopType={shop.type}
        averageRating={ratingData.average}
        ratingCount={ratingData.count}
        verificationLevel={shop.verification?.level ?? 'none'}
        shopWhatsapp={shopWhatsapp}
        shareShopWhatsapp={shareShopWhatsapp}
        qrCodeUrl={qrCodeUrl}
      />
      <ReportButton targetType="shop" targetId={shop.id} label="Signaler cette boutique" />
      {responseHistory && responseHistory.responsesSent > 0 ? (
        <section className="my-8 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Historique de réponse</h2>
          <p className="mt-1 text-xs text-stone-500">Basé sur les demandes clients publiées sur ArtisanConnect.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md bg-stone-100 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-stone-500">Taux de réponse</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">{responseHistory.responseRate}%</p>
            </div>
            <div className="rounded-md bg-stone-100 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-stone-500">Délai moyen</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {responseHistory.averageResponseMinutes >= 60
                  ? `${Math.round(responseHistory.averageResponseMinutes / 60)} h`
                  : `${responseHistory.averageResponseMinutes} min`}
              </p>
            </div>
            <div className="rounded-md bg-stone-100 p-3 text-center">
              <p className="text-xs uppercase tracking-wide text-stone-500">Dernière réponse</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">
                {responseHistory.lastResponseAt ? new Date(responseHistory.lastResponseAt).toLocaleDateString('fr-FR') : '—'}
              </p>
            </div>
          </div>
        </section>
      ) : null}
      <section className="mb-8 rounded-lg border border-stone-200 bg-white p-6">
        <h2 className="mb-1 text-lg font-semibold">Avis sur l’artisan</h2>
        <p className="mb-4 text-xs text-stone-500">Seuls les clients ayant terminé une commande peuvent laisser un avis.</p>
        {!reviews.length ? (
          <p className="text-sm text-stone-600">Aucun avis pour le moment.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review: any) => (
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
              <li key={listing.id} className="h-full">
                <Link
                  href={`/listings/${listing.id}`}
                  className="group flex h-full flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs transition hover:border-amber-600 hover:shadow-sm"
                >
                  <div className="relative flex h-48 w-full shrink-0 items-center justify-center overflow-hidden bg-stone-100 text-3xl">
                    {listing.imageUrl ? (
                      <img
                        src={resolveMediaUrl(listing.imageUrl)}
                        alt={listing.title}
                        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                      />
                    ) : <span className="text-sm font-medium text-stone-500">{categoryLabel(listing.category)}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="line-clamp-2 font-medium text-stone-900 group-hover:text-amber-800">{listing.title}</div>
                    <div className="mb-1 truncate text-xs uppercase tracking-wide text-stone-500">{categoryLabel(listing.category)}</div>
                    <div className="mt-2 font-semibold text-amber-700">{formatXAF(listing.price)}</div>
                    <span className="mt-auto inline-flex w-fit rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white group-hover:bg-amber-800">
                      {listing.stock > 0 ? 'Voir et commander' : 'Voir l’annonce'}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

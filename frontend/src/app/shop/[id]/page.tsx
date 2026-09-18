import { notFound } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatXAF } from '@/lib/format';
import { categoryLabel } from '@/lib/categories';
import { resolveMediaUrl } from '@/lib/media';
import { whatsappHref } from '@/lib/whatsapp';
import { ShopPublicCard } from '@/components/ShopPublicCard';
import { ReportButton } from '@/components/ReportButton';
import { ShopReviews } from '@/components/ShopReviews';
import { CollapsibleSection } from '@/components/CollapsibleSection';

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
  const services: any[] = (data as any).services ?? [];
  const reviews: any[] = [...(serviceReviews?.[0] ?? []), ...(productReviews?.[0] ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const shopWhatsapp = whatsappHref(shop.seller?.whatsappPhone ?? shop.seller?.phone, `Bonjour ${shop.seller?.name ?? shop.name}, je souhaite découvrir vos créations sur ArtisanConnect.`);
  const shopUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info'}/shop/${shop.id}`;
  const shareShopWhatsapp = `https://wa.me/?text=${encodeURIComponent(`Découvrez la boutique « ${shop.name} » sur ArtisanConnect : ${shopUrl}`)}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shopUrl)}`;
  const quoteHref = `/customer-requests?category=${encodeURIComponent(shop.category ?? '')}&city=${encodeURIComponent(shop.city ?? '')}&neighborhood=${encodeURIComponent(shop.neighborhood ?? '')}`;
  const availabilityLabel: Record<string, { label: string; className: string }> = {
    available: { label: '● Disponible pour de nouveaux projets', className: 'bg-emerald-50 text-emerald-800' },
    busy: { label: '● Peu de disponibilité en ce moment', className: 'bg-amber-50 text-amber-800' },
    unavailable: { label: '● Indisponible actuellement', className: 'bg-stone-100 text-stone-600' },
  };
  const availability = availabilityLabel[shop.availability ?? 'available'];

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
        city={shop.city}
        quoteHref={quoteHref}
      />

      <CollapsibleSection
        title="En bref"
        subtitle="Spécialité, zone d’intervention, prix et délais"
        defaultOpen
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Spécialité</p>
            <p className="mt-1 font-medium text-stone-900">{shop.category ? categoryLabel(shop.category) : '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Où il travaille</p>
            <p className="mt-1 font-medium text-stone-900">{[shop.neighborhood, shop.city].filter(Boolean).join(', ') || '—'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Fourchette de prix</p>
            <p className="mt-1 font-medium text-stone-900">
              {shop.priceRange ? `${formatXAF(shop.priceRange.min)} – ${formatXAF(shop.priceRange.max)}` : 'Sur devis'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Délai moyen</p>
            <p className="mt-1 font-medium text-stone-900">
              {shop.averageDelayDays ? `${shop.averageDelayDays} jours` : 'À convenir'}
            </p>
          </div>
          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${availability.className}`}>{availability.label}</span>
            <span className="text-sm text-stone-500">
              Sur ArtisanConnect depuis {new Date(shop.memberSince ?? shop.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>
      </CollapsibleSection>

      {services.length ? (
        <CollapsibleSection title="Services proposés" subtitle={`${services.length} prestation(s) validée(s)`} defaultOpen>
          <ul className="space-y-3">
            {services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <Link href={`/services/${service.id}`} className="font-medium text-stone-900 hover:text-amber-800">{service.title}</Link>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{categoryLabel(service.category)} · {service.estimatedDays} jours</p>
                </div>
                <span className="text-sm font-semibold text-amber-700">
                  {service.priceMin && service.priceMax
                    ? `${formatXAF(service.priceMin)} – ${formatXAF(service.priceMax)}`
                    : formatXAF(service.price)}
                </span>
              </li>
            ))}
          </ul>
          <Link href={quoteHref} className="mt-5 inline-flex rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">
            Demander un devis pour mon projet
          </Link>
        </CollapsibleSection>
      ) : null}

      <ReportButton targetType="shop" targetId={shop.id} label="Signaler cette boutique" />
      {responseHistory && responseHistory.responsesSent > 0 ? (
        <CollapsibleSection title="Historique de réponse" subtitle="Basé sur les demandes clients publiées sur ArtisanConnect">
          <div className="grid gap-3 sm:grid-cols-3">
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
        </CollapsibleSection>
      ) : null}
      <ShopReviews reviews={reviews} />
      <CollapsibleSection
        title="Annonces de la boutique"
        subtitle={listings.length ? `${listings.length} annonce(s) en vente` : 'Aucune annonce publiée'}
        defaultOpen
      >
        {listings.length === 0 ? (
          <p className="text-stone-600">Cette boutique n&apos;a pas encore publié d&apos;annonce.</p>
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
      </CollapsibleSection>
    </main>
  );
}

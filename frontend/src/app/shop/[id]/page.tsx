import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import type { Listing, Review, Service, ServiceReview, Shop } from '@/lib/types';
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

type PublicShop = Shop & {
  priceRange?: { min: number; max: number } | null;
  averageDelayDays?: number | null;
  memberSince?: string | null;
  services?: Service[];
};

type PublicShopData = { shop: PublicShop; listings: Listing[]; services?: Service[] };

export default async function ShopPublicPage({ params }: { params: Promise<{ id: string }> }) {
  let data: PublicShopData | null = null;
  let serviceReviews: [ServiceReview[], number] | null = null;
  let productReviews: [Review[], number] | null = null;
  let responseHistory: ResponseHistory | null = null;
  let ratingData: { average: number | null; count: number } = { average: null, count: 0 };
  try {
    const { id } = await params;
    const publicData = await api.shopPublic(id);
    data = publicData;
    if (data?.shop?.sellerId) {
      [serviceReviews, productReviews, ratingData, responseHistory] = await Promise.all([
        api.getArtisanServiceReviews(data.shop.sellerId),
        api.sellerReviews(data.shop.sellerId),
        api.getArtisanServiceRating(data.shop.sellerId),
        api.getArtisanResponseHistory(data.shop.sellerId),
      ]) as [[ServiceReview[], number], [Review[], number], { average: number | null; count: number }, ResponseHistory];
    }
  } catch {
    // do nothing; will handle with notFound
  }
  if (!data || !data.shop) return notFound();
  const { shop, listings } = data;
  const services = data.services ?? [];
  const portfolioPhotos = listings.flatMap((listing) => {
    const imageUrls = [...new Set([...(listing.imageUrls ?? []), listing.imageUrl].filter((url): url is string => Boolean(url)))];
    return imageUrls.map((url, index) => ({ key: `${listing.id}-${index}`, url, title: listing.title, listingId: listing.id, price: listing.price }));
  }).slice(0, 12);
  const reviews = [...(serviceReviews?.[0] ?? []), ...(productReviews?.[0] ?? [])].sort(
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
  const interventionLabels: Record<string, string> = {
    workshop: 'À l’atelier',
    home: 'À domicile',
    carrier: 'Livraison / transporteur',
  };
  const interventionMethods = shop.deliveryMethods?.length
    ? shop.deliveryMethods
    : [shop.deliveryMode ?? 'workshop'];

  return (
    <main className="mx-auto max-w-3xl p-6 pb-28 sm:pb-6">
      <ShopPublicCard
        shopId={shop.id}
        shopName={shop.name}
        profileImageUrl={shop.seller?.avatarUrl}
        category={shop.category}
        location={[shop.neighborhood, shop.city].filter(Boolean).join(', ')}
        averageRating={ratingData.average}
        ratingCount={ratingData.count}
        verificationLevel={shop.verification?.level ?? 'none'}
        verificationState={shop.verification}
        shopWhatsapp={shopWhatsapp}
        shareShopWhatsapp={shareShopWhatsapp}
        qrCodeUrl={qrCodeUrl}
        city={shop.city}
        quoteHref={quoteHref}
      />

      <section className="mb-6 space-y-4" aria-labelledby="shop-portfolio-title">
        <header className="flex flex-wrap items-end justify-between gap-2 border-b border-stone-200 pb-3">
          <div>
            <h2 id="shop-portfolio-title" className="text-2xl font-semibold text-stone-900">Réalisations</h2>
            <p className="mt-1 text-sm text-stone-600">{portfolioPhotos.length} photo(s) de réalisations</p>
          </div>
        </header>
        {portfolioPhotos.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            {portfolioPhotos.map((photo) => (
              <Link key={photo.key} href={`/listings/${photo.listingId}`} aria-label={`${photo.title} — ${formatXAF(photo.price)}`} className="group min-w-0 overflow-hidden rounded-md border border-stone-200 bg-white transition hover:border-amber-600 hover:shadow-sm">
                <div className="relative aspect-square overflow-hidden bg-stone-100">
                  <Image src={resolveMediaUrl(photo.url)} alt={photo.title} fill unoptimized sizes="(max-width: 640px) 50vw, 33vw" className="object-cover transition duration-300 group-hover:scale-105" />
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-sm font-medium text-stone-900 group-hover:text-amber-800">{photo.title}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-800">{formatXAF(photo.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="border-y border-stone-200 py-6 text-sm text-stone-600">Aucune réalisation avec photo n’est publiée pour le moment.</p>
        )}
        {listings.length ? (
          <details className="border-t border-stone-100 pt-3">
            <summary className="cursor-pointer text-sm font-semibold text-stone-700">Voir les {listings.length} annonces de la boutique</summary>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {listings.map((listing) => (
                <li key={listing.id} className="h-full">
                  <Link href={`/listings/${listing.id}`} className="group flex h-full items-center gap-3 rounded-md border border-stone-200 bg-white p-3 transition hover:border-amber-600 hover:shadow-sm">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded bg-stone-100">
                      {listing.imageUrl ? <Image src={resolveMediaUrl(listing.imageUrl)} alt="" fill unoptimized sizes="64px" className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-stone-500">{categoryLabel(listing.category)}</span>}
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium text-stone-900 group-hover:text-amber-800">{listing.title}</p>
                      <p className="mt-1 text-sm font-semibold text-amber-800">{formatXAF(listing.price)}</p>
                      <p className="text-xs text-stone-500">{listing.stock > 0 ? 'Voir et commander' : 'Voir l’annonce'}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </section>

      {services.length ? (
        <CollapsibleSection title="Services" subtitle={services.length === 1 ? '1 service principal' : `${Math.min(services.length, 5)} services principaux`} defaultOpen>
          <ul className="space-y-3">
            {services.slice(0, 5).map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                <div>
                  <Link href={`/services/${service.id}`} className="font-medium text-stone-900 hover:text-amber-800">{service.title}</Link>
                  <p className="text-xs uppercase tracking-wide text-stone-500">{categoryLabel(service.category)} · {service.estimatedDays} jours</p>
                </div>
                <span className="text-sm font-semibold text-amber-700">
                  {service.priceMin && service.priceMax
                    ? `${formatXAF(service.priceMin)} – ${formatXAF(service.priceMax)}`
                    : service.price ? formatXAF(service.price) : 'Sur devis'}
                </span>
              </li>
            ))}
          </ul>
          {services.length > 5 ? (
            <details className="mt-4 border-t border-stone-100 pt-3">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">Voir les {services.length - 5} autres prestations</summary>
              <ul className="mt-3 space-y-3">
                {services.slice(5).map((service) => (
                  <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/services/${service.id}`} className="font-medium text-stone-900 hover:text-amber-800">{service.title}</Link>
                      <p className="text-xs uppercase tracking-wide text-stone-500">{categoryLabel(service.category)} · {service.estimatedDays} jours</p>
                    </div>
                    <span className="text-sm font-semibold text-amber-700">
                      {service.priceMin && service.priceMax
                        ? `${formatXAF(service.priceMin)} – ${formatXAF(service.priceMax)}`
                        : service.price ? formatXAF(service.price) : 'Sur devis'}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </CollapsibleSection>
      ) : (
        <section className="mb-6 border-y border-stone-200 py-5">
          <h2 className="text-xl font-semibold text-stone-900">Services</h2>
          <p className="mt-2 text-sm text-stone-600">Contactez l’artisan pour préciser votre besoin et les prestations possibles.</p>
          <Link href={quoteHref} className="mt-4 inline-flex rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">Demander un devis</Link>
        </section>
      )}

      <section className="mb-6 grid gap-6 border-y border-stone-200 py-5 sm:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Combien ça coûte ?</h2>
          <p className="mt-2 text-xl font-semibold text-amber-800">
            {shop.priceRange ? `${formatXAF(shop.priceRange.min)} – ${formatXAF(shop.priceRange.max)}` : 'Sur devis'}
          </p>
          <p className="mt-1 text-sm text-stone-600">Prix indicatifs, à confirmer selon votre projet.</p>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Quand est-il disponible ?</h2>
          <span className={`mt-2 inline-flex rounded-full px-3 py-1.5 text-sm font-medium ${availability.className}`}>{availability.label}</span>
        </div>
      </section>

      <section className="mb-4">
        <h2 className="text-xl font-semibold text-stone-900">Avis</h2>
        <p className="mt-1 text-sm text-stone-600">Retours des clients après une commande ou une prestation terminée.</p>
      </section>

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

      <section className="mb-6 flex flex-col gap-3 border-y border-stone-200 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Un projet en tête ?</h2>
          <p className="mt-1 text-sm text-stone-600">Expliquez votre besoin et recevez un devis adapté.</p>
        </div>
        <Link href={quoteHref} className="inline-flex justify-center rounded-md bg-amber-700 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-800">
          Demander un devis
        </Link>
      </section>

      <CollapsibleSection title="À propos" subtitle="Présentation et informations pratiques">
        {shop.description && shop.description.trim().toLocaleLowerCase() !== shop.name.trim().toLocaleLowerCase() ? <p className="mb-5 whitespace-pre-line text-sm leading-7 text-stone-700">{shop.description}</p> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Délai moyen de réalisation</p>
            <p className="mt-1 font-medium text-stone-900">{shop.averageDelayDays ? `${shop.averageDelayDays} jours` : 'À convenir'}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">Mode d’intervention</p>
            <p className="mt-1 font-medium text-stone-900">{interventionMethods.map((method) => interventionLabels[method] ?? method).join(' · ')}</p>
          </div>
          <p className="text-sm text-stone-500 sm:col-span-2">
            Sur ArtisanConnect depuis {new Date(shop.memberSince ?? shop.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </CollapsibleSection>
      <ReportButton targetType="shop" targetId={shop.id} label="Signaler cette boutique" />
    </main>
  );
}

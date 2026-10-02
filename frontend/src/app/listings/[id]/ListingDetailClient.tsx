'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { ReportButton } from '@/components/ReportButton';
import { ShopReviews } from '@/components/ShopReviews';
import { trackEvent } from '@/lib/analytics';
import { categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import { isDemoContent } from '@/lib/demo-mode';
import { CARRIER_ENABLED, CARRIER_SIMULATION_MODE, MOBILE_MONEY_ENABLED, MOBILE_MONEY_TEST_MODE } from '@/lib/pilot-capabilities';
import { resolveMediaUrl } from '@/lib/media';
import { whatsappHref } from '@/lib/whatsapp';
import { DemoBadge } from '@/components/DemoBadge';
import type { Listing, Review } from '@/lib/types';

export default function ListingDetailClient({ listing, rating, reviews }: {
  listing: Listing;
  rating: { average: number | null; count: number };
  reviews: Review[];
}) {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'orange_money'>('cash');
  const [deliveryMethod, setDeliveryMethod] = useState<'workshop' | 'home' | 'carrier'>('workshop');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [offeredUnitPrice, setOfferedUnitPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offering, setOffering] = useState(false);
  const [offerNotice, setOfferNotice] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const images = listing?.imageUrls?.length ? listing.imageUrls : listing?.imageUrl ? [listing.imageUrl] : [];

  useEffect(() => {
    if (!listing) return;
    trackEvent('listing_view', { targetId: listing.id, label: listing.category, city: listing.shop?.city ?? undefined });
  }, [listing]);

  useEffect(() => {
    if (zoomIndex === null || images.length === 0) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setZoomIndex(null);
      if (event.key === 'ArrowRight') setZoomIndex((index) => index === null ? null : (index + 1) % images.length);
      if (event.key === 'ArrowLeft') setZoomIndex((index) => index === null ? null : (index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomIndex, images.length]);

  /* Synchronise the initial buyer choices with the seller's accepted options. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!listing) return;
    const payments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'] as const;
    const availablePayments = payments.filter((method) => method === 'cash' || MOBILE_MONEY_ENABLED);
    const deliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'] as const;
    const availableDeliveries = deliveries.filter((method) => method !== 'carrier' || CARRIER_ENABLED);
    if (!availablePayments.includes(paymentMethod)) setPaymentMethod(availablePayments[0] ?? 'cash');
    if (!availableDeliveries.includes(deliveryMethod)) setDeliveryMethod(availableDeliveries[0] ?? 'workshop');
  }, [listing, paymentMethod, deliveryMethod]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleOrder = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listings/${listing.id}`)}`);
      return;
    }
    const orderPayments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'] as const;
    const orderDeliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'] as const;
    const availablePayments = orderPayments.filter((method) => method === 'cash' || MOBILE_MONEY_ENABLED);
    const availableDeliveries = orderDeliveries.filter((method) => method !== 'carrier' || CARRIER_ENABLED);
    if (!availablePayments.includes(paymentMethod)) {
      setError(t('mobile_money_coming_soon'));
      return;
    }
    if (!availableDeliveries.includes(deliveryMethod)) {
      setError(t('carrier_coming_soon'));
      return;
    }
    if (paymentMethod === 'momo' && !payerPhone.trim()) {
      setError('Veuillez saisir votre numéro MoMo.');
      return;
    }
    if (deliveryMethod !== 'workshop' && !deliveryAddress.trim()) {
      setError('Veuillez saisir une adresse de livraison.');
      return;
    }

    setOrdering(true);
    setError('');
    try {
      const order = await api.createOrder({
        listingId: listing.id,
        quantity,
        paymentMethod,
        deliveryMethod,
        deliveryAddress: deliveryMethod !== 'workshop' ? deliveryAddress : undefined,
      });
      trackEvent('order_created', { targetId: listing.id, label: listing.category, city: listing.shop?.city ?? undefined });
      if (paymentMethod === 'momo') {
        const payment = await api.initiateMomoPayment(order.id, payerPhone);
        if (payment.redirectUrl) {
          window.location.assign(payment.redirectUrl);
          return;
        }

        const referenceId = payment.paymentReference || payment.orangeMoneyTransactionId;
        if (referenceId) {
          router.push(`/payment/callback?type=payment&referenceId=${encodeURIComponent(referenceId)}`);
          return;
        }
      }
      if (paymentMethod === 'orange_money') {
        const orangePayment = await api.startWebpayment(order.id);
        window.location.assign(orangePayment.paymentUrl);
        return;
      }
      router.push('/orders');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'La commande a échoué. Réessayez.');
      setOrdering(false);
    }
  };

  const handleOffer = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/listings/${listing.id}`)}`);
      return;
    }
    const price = Number(offeredUnitPrice);
    if (!Number.isInteger(price) || price < 1) {
      setOfferNotice('Saisissez un prix unitaire entier et positif en FCFA.');
      return;
    }
    if (deliveryMethod !== 'workshop' && !deliveryAddress.trim()) {
      setOfferNotice('Veuillez saisir une adresse de livraison.');
      return;
    }
    setOffering(true);
    setOfferNotice('');
    try {
      await api.createListingOffer({
        listingId: listing.id,
        quantity,
        offeredUnitPrice: price,
        message: offerMessage.trim() || undefined,
        paymentMethod,
        deliveryMethod,
        deliveryAddress: deliveryMethod !== 'workshop' ? deliveryAddress : undefined,
      });
      setOfferNotice('Offre envoyée au vendeur. Vous serez informé de sa réponse avant tout paiement.');
      setOfferedUnitPrice('');
      setOfferMessage('');
    } catch (err) {
      setOfferNotice(err instanceof ApiError ? err.message : 'Impossible d’envoyer cette offre.');
    } finally {
      setOffering(false);
    }
  };

  const isOwnListing = user?.id === listing.sellerId;
  const isDemoOffer = isDemoContent(listing.id, listing.isDemo);
  const total = Number(listing.price) * quantity;
  const acceptedPayments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'] as const;
  const acceptedDeliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'] as const;
  const availablePayments = acceptedPayments.filter((method) => method === 'cash' || MOBILE_MONEY_ENABLED);
  const availableDeliveries = acceptedDeliveries.filter((method) => method !== 'carrier' || CARRIER_ENABLED);
  const hasAvailablePayment = availablePayments.length > 0;
  const hasAvailableDelivery = availableDeliveries.length > 0;
  const paymentLabel = paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'momo' ? 'MoMo' : 'Orange Money';
  const deliveryLabel = deliveryMethod === 'home' ? 'Livraison à domicile' : deliveryMethod === 'carrier' ? 'Transporteur' : "Retrait à l'atelier";
  const sellerWhatsapp = whatsappHref(listing.seller?.whatsappPhone ?? listing.seller?.phone, `Bonjour ${listing.seller?.name ?? ''}, je suis intéressé par votre annonce « ${listing.title} » sur ArtisanConnect.`);
    const sellerShopId = listing.shop?.id ?? listing.shopId;
  const shareUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info'}/listings/${listing.id}`;
  const shareWhatsapp = `https://wa.me/?text=${encodeURIComponent(`Découvrez « ${listing.title} » sur ArtisanConnect : ${shareUrl}`)}`;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.length ? images.map((image, index) => <button key={`${image}-${index}`} type="button" onClick={() => setZoomIndex(index)} aria-label={`Agrandir la photo ${index + 1} de ${listing.title}`} className="group relative aspect-square overflow-hidden rounded-lg bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600"><Image src={resolveMediaUrl(image)} alt={`${listing.title} ${index + 1}`} fill unoptimized sizes="(max-width: 640px) 50vw, 33vw" className="object-cover transition duration-200 group-hover:scale-105" /><span className="absolute bottom-2 right-2 rounded-md bg-stone-900/75 px-2 py-1 text-xs text-white">Agrandir</span></button>) : <div className="col-span-full flex h-64 items-center justify-center rounded-lg bg-stone-100 text-sm font-medium text-stone-500">{categoryLabel(listing.category)}</div>}
        </div>

        {zoomIndex !== null && images[zoomIndex] ? (
          <div role="dialog" aria-modal="true" aria-label="Aperçu agrandi" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomIndex(null)}>
            <div className="relative flex max-h-[90vh] max-w-6xl items-center gap-3" onClick={(event) => event.stopPropagation()}>
              <button type="button" aria-label="Image précédente" onClick={() => setZoomIndex((index) => index === null ? null : (index - 1 + images.length) % images.length)} className="rounded-full bg-white/90 px-4 py-3 text-xl text-stone-900 shadow">‹</button>
              <Image src={resolveMediaUrl(images[zoomIndex])} alt={`${listing.title} agrandie`} width={1600} height={1200} unoptimized className="h-auto max-h-[85vh] max-w-[80vw] rounded-lg object-contain shadow-2xl" />
              <button type="button" aria-label="Image suivante" onClick={() => setZoomIndex((index) => index === null ? null : (index + 1) % images.length)} className="rounded-full bg-white/90 px-4 py-3 text-xl text-stone-900 shadow">›</button>
              <button type="button" aria-label="Fermer" onClick={() => setZoomIndex(null)} className="absolute -right-2 -top-12 rounded-full bg-white px-3 py-1 text-xl text-stone-900 shadow">×</button>
            </div>
          </div>
        ) : null}

        <span className="mt-6 inline-block text-xs uppercase tracking-wide text-stone-500">
          {categoryLabel(listing.category)} · {listing.type === 'service' ? 'Service' : 'Produit'}
        </span>
        {isDemoOffer ? <div className="mt-3"><DemoBadge /></div> : null}
        <h1 className="mt-1 text-2xl font-semibold">{listing.title}</h1>
        <p className="mt-4 whitespace-pre-line text-stone-700">{listing.description}</p>

        {listing.seller && (
          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-500">Vendu par</p>
            {sellerShopId ? <Link href={`/shop/${sellerShopId}`} className="font-medium text-amber-800 underline">{listing.seller.name}</Link> : <p className="font-medium">{listing.seller.name}</p>}
            {[listing.shop?.neighborhood, listing.shop?.city ?? listing.seller.location].filter(Boolean).length ? <p className="text-sm text-stone-600">{[listing.shop?.neighborhood, listing.shop?.city ?? listing.seller.location].filter(Boolean).join(', ')}</p> : null}
            <p className="mt-1 text-sm text-stone-600">
              {rating?.average
                ? `⭐ ${rating.average}/5 (${rating.count} avis)`
                : 'Pas encore d’avis'}
            </p>
            {!isOwnListing && !isDemoOffer && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {user ? <Link href={`/messages?to=${listing.sellerId}`} className="text-sm text-amber-700 underline">Contacter l&apos;artisan par message</Link> : <Link href={`/login?next=${encodeURIComponent(`/messages?to=${listing.sellerId}`)}`} className="text-sm text-amber-700 underline">Se connecter pour envoyer un message</Link>}
                {sellerWhatsapp ? <a href={sellerWhatsapp} target="_blank" rel="noreferrer" onClick={() => trackEvent('whatsapp_click', { targetId: listing.id, label: listing.category, city: listing.shop?.city ?? undefined })} className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">WhatsApp</a> : null}
              </div>
            )}
            {!isDemoOffer ? <a href={shareWhatsapp} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-md border border-green-600 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50">
              Partager sur WhatsApp
            </a> : null}
            {!isOwnListing && !isDemoOffer ? <ReportButton targetType="listing" targetId={listing.id} label="Signaler cette annonce" /> : null}
          </div>
        )}
        <ShopReviews reviews={reviews} />
      </div>

      <aside className="h-fit rounded-lg border border-stone-200 bg-white p-6">
        <section className="mb-5 border-b border-stone-200 pb-4">
          <h2 className="text-sm font-semibold text-stone-800">Ce produit est-il disponible maintenant ?</h2>
          <p className={`mt-1 text-sm font-medium ${isDemoOffer ? 'text-amber-800' : listing.stock > 0 ? 'text-emerald-800' : 'text-stone-600'}`}>
            {isDemoOffer ? 'Stock de démonstration — disponibilité réelle à confirmer' : listing.stock > 0 ? `Oui — ${listing.stock} disponible(s)` : 'Non — rupture de stock'}
          </p>
        </section>
        {isDemoOffer ? (
          <div role="status" className="space-y-3 rounded-md bg-amber-50 p-4 text-sm text-amber-900">
            <DemoBadge />
            <p>Cette fiche, son prix et son stock sont présentés à titre de démonstration. La commande n’est pas disponible.</p>
          </div>
        ) : (
          <>
        <p className="text-3xl font-semibold">{formatXAF(listing.price)}</p>

        <label htmlFor="quantity" className="mt-6 block text-sm font-medium">
          Quantité
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={listing.stock || 1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="mt-1 w-24 rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
        />

        <div className="mt-6 flex justify-between border-t border-stone-200 pt-4 font-medium">
          <span>Total à régler</span>
          <span>{formatXAF(total)}</span>
        </div>

        {!isOwnListing && !isDemoOffer && user?.role === 'client' ? (
          <details className="mt-4 rounded-md border border-amber-200 bg-amber-50/40">
            <summary className="cursor-pointer px-3 py-3 text-sm font-semibold text-amber-900">Proposer un prix au vendeur</summary>
            <div className="space-y-3 border-t border-amber-100 p-3">
              <p className="text-xs text-stone-600">Votre proposition porte sur le prix unitaire et n’entraîne aucun paiement immédiat.</p>
              <label htmlFor="offered-unit-price" className="block text-sm font-medium text-stone-700">Prix unitaire proposé (FCFA)</label>
              <input id="offered-unit-price" type="number" min="1" step="1" value={offeredUnitPrice} onChange={(event) => setOfferedUnitPrice(event.target.value)} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 outline-none focus:border-amber-600" />
              <label htmlFor="offer-message" className="block text-sm font-medium text-stone-700">Message au vendeur (facultatif)</label>
              <textarea id="offer-message" maxLength={500} rows={3} value={offerMessage} onChange={(event) => setOfferMessage(event.target.value)} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 outline-none focus:border-amber-600" />
              {offerNotice ? <p role="status" className="text-sm text-stone-700">{offerNotice}</p> : null}
              <button type="button" onClick={() => void handleOffer()} disabled={offering || listing.stock === 0 || !offeredUnitPrice} className="w-full rounded-md border border-amber-700 px-3 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60">{offering ? 'Envoi…' : 'Envoyer mon offre'}</button>
            </div>
          </details>
        ) : null}
        {!isOwnListing && !isDemoOffer && !user ? <Link href={`/login?next=${encodeURIComponent(`/listings/${listing.id}`)}`} className="mt-4 block text-center text-sm font-medium text-amber-800 underline">Connectez-vous pour proposer un prix</Link> : null}

        <section className="mt-6 rounded-md border border-stone-200">
          <button
            type="button"
            onClick={() => setPaymentOpen((open) => !open)}
            aria-expanded={paymentOpen}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium">Mode de paiement</span>
              <span className="block text-xs text-stone-500">{paymentLabel}</span>
            </span>
            <span className="text-lg text-stone-500">{paymentOpen ? '-' : '+'}</span>
          </button>
          {paymentOpen && (
            <fieldset className="space-y-2 border-t border-stone-100 p-3 pt-2">
              <legend className="sr-only">Mode de paiement</legend>
              {acceptedPayments.includes('cash') && <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-amber-600">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === 'cash'}
                  onChange={() => setPaymentMethod('cash')}
                />
                <span>
                  <strong>Paiement en espèces</strong>
                  <span className="block text-xs text-stone-500">À la remise de la commande</span>
                </span>
              </label>}
              <label className={`flex items-center gap-3 rounded-md border p-3 text-sm ${MOBILE_MONEY_ENABLED ? 'cursor-pointer border-stone-200 hover:border-orange-500' : 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-500'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="momo"
                  checked={paymentMethod === 'momo'}
                  onChange={() => setPaymentMethod('momo')}
                  disabled={!MOBILE_MONEY_ENABLED}
                />
                <span>
                  <strong>MoMo</strong>
                  <span className="block text-xs text-stone-500">{MOBILE_MONEY_ENABLED ? (MOBILE_MONEY_TEST_MODE ? t('payment_test_mode_notice') : t('payment_live_notice')) : t('mobile_money_coming_soon')}</span>
                </span>
              </label>
              <label className={`flex items-center gap-3 rounded-md border p-3 text-sm ${MOBILE_MONEY_ENABLED ? 'cursor-pointer border-stone-200 hover:border-orange-500' : 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-500'}`}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="orange_money"
                  checked={paymentMethod === 'orange_money'}
                  onChange={() => setPaymentMethod('orange_money')}
                  disabled={!MOBILE_MONEY_ENABLED}
                />
                <span>
                  <strong>Orange Money</strong>
                  <span className="block text-xs text-stone-500">{MOBILE_MONEY_ENABLED ? (MOBILE_MONEY_TEST_MODE ? t('payment_test_mode_notice') : t('payment_live_notice')) : t('mobile_money_coming_soon')}</span>
                </span>
              </label>
            </fieldset>
          )}
        </section>

        <section className="mt-4 rounded-md border border-stone-200">
          <button
            type="button"
            onClick={() => setDeliveryOpen((open) => !open)}
            aria-expanded={deliveryOpen}
            className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
          >
            <span>
              <span className="block text-sm font-medium">Mode de livraison</span>
              <span className="block text-xs text-stone-500">{deliveryLabel}</span>
            </span>
            <span className="text-lg text-stone-500">{deliveryOpen ? '-' : '+'}</span>
          </button>
          {deliveryOpen && (
            <fieldset className="space-y-2 border-t border-stone-100 p-3 pt-2">
              <legend className="sr-only">Mode de livraison</legend>
              {acceptedDeliveries.includes('workshop') && <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-amber-600">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="workshop"
                  checked={deliveryMethod === 'workshop'}
                  onChange={() => setDeliveryMethod('workshop')}
                />
                <span>
                  <strong>Retrait à l&apos;atelier</strong>
                  <span className="block text-xs text-stone-500">Vous récupérez la commande chez l&apos;artisan</span>
                </span>
              </label>}
              {acceptedDeliveries.includes('home') && <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-amber-600">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="home"
                  checked={deliveryMethod === 'home'}
                  onChange={() => setDeliveryMethod('home')}
                />
                <span>
                  <strong>Livraison à domicile</strong>
                  <span className="block text-xs text-stone-500">Adresse complète et repère requis</span>
                </span>
              </label>}
              <label className={`flex items-center gap-3 rounded-md border p-3 text-sm ${CARRIER_ENABLED ? 'cursor-pointer border-stone-200 hover:border-amber-600' : 'cursor-not-allowed border-stone-200 bg-stone-100 text-stone-500'}`}>
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="carrier"
                  checked={deliveryMethod === 'carrier'}
                  onChange={() => setDeliveryMethod('carrier')}
                  disabled={!CARRIER_ENABLED}
                />
                <span>
                  <strong>Transporteur</strong>
                  <span className="block text-xs text-stone-500">{CARRIER_ENABLED ? (CARRIER_SIMULATION_MODE ? t('carrier_simulation_notice') : 'Suivi fourni par le transporteur sélectionné.') : t('carrier_coming_soon')}</span>
                </span>
              </label>
            </fieldset>
          )}
        </section>

        {deliveryMethod !== 'workshop' && (
          <div className="mt-4">
            <label htmlFor="deliveryAddress" className="block text-sm font-medium">
              Adresse de livraison
            </label>
            <textarea
              id="deliveryAddress"
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              rows={3}
              placeholder="Ville, quartier, repère, numéro joignable"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            />
          </div>
        )}

        {paymentMethod === 'momo' && (
          <div className="mt-4">
            <label htmlFor="payerPhone" className="block text-sm font-medium">
              Numéro MoMo
            </label>
            <input
              id="payerPhone"
              type="tel"
              value={payerPhone}
              onChange={(event) => setPayerPhone(event.target.value)}
              placeholder="Ex: 237699000000"
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
            />
          </div>
        )}

        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {paymentMethod === 'cash'
            ? t('cash_handover_notice')
            : MOBILE_MONEY_TEST_MODE ? t('payment_test_mode_notice') : t('payment_live_notice')}
        </div>
        {!hasAvailablePayment ? <p role="note" className="mt-3 rounded-md border border-stone-200 bg-stone-100 p-3 text-sm text-stone-600">{t('mobile_money_coming_soon')}</p> : null}
        {!hasAvailableDelivery ? <p role="note" className="mt-3 rounded-md border border-stone-200 bg-stone-100 p-3 text-sm text-stone-600">{t('carrier_coming_soon')}</p> : null}
        {deliveryMethod === 'carrier' && CARRIER_SIMULATION_MODE ? <p role="note" className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{t('carrier_simulation_notice')}</p> : null}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {isOwnListing ? (
          <p className="mt-6 text-center text-sm text-stone-500">
            Vous ne pouvez pas commander votre propre annonce.
          </p>
        ) : (
          <button
            onClick={handleOrder}
            disabled={ordering || listing.stock === 0 || !ready || !hasAvailablePayment || !hasAvailableDelivery}
            className="mt-6 w-full rounded-md bg-amber-700 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {ordering ? 'Commande en cours…' : user ? 'Commander' : 'Se connecter pour commander'}
          </button>
        )}
          </>
        )}
      </aside>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import { resolveMediaUrl } from '@/lib/media';
import { whatsappHref } from '@/lib/whatsapp';

export default function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const { user, ready } = useAuth();
  const router = useRouter();

  const { data: listing, isLoading } = useSWR(['listing', id], ([, listingId]) =>
    api.listing(listingId),
  );
  const { data: rating } = useSWR(listing ? ['rating', listing.sellerId] : null, ([, sellerId]) =>
    api.sellerRating(sellerId),
  );

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'momo' | 'orange_money'>('cash');
  const [deliveryMethod, setDeliveryMethod] = useState<'workshop' | 'home' | 'carrier'>('workshop');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(true);
  const [deliveryOpen, setDeliveryOpen] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [error, setError] = useState('');
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const images = listing?.imageUrls?.length ? listing.imageUrls : listing?.imageUrl ? [listing.imageUrl] : [];

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
    const deliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'] as const;
    if (!payments.includes(paymentMethod)) setPaymentMethod(payments[0]);
    if (!deliveries.includes(deliveryMethod)) setDeliveryMethod(deliveries[0]);
  }, [listing, paymentMethod, deliveryMethod]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleOrder = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!listing) return;
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

  if (isLoading) return <p className="text-stone-600">Chargement…</p>;
  if (!listing)
    return (
      <div className="space-y-4">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          Annonce introuvable.
        </p>
        <Link href="/" className="text-amber-700 underline">
          Retour au catalogue
        </Link>
      </div>
    );

  const isOwnListing = user?.id === listing.sellerId;
  const total = Number(listing.price) * quantity;
  const acceptedPayments = listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money'] as const;
  const acceptedDeliveries = listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier'] as const;
  const paymentLabel = paymentMethod === 'cash' ? 'Espèces' : paymentMethod === 'momo' ? 'MoMo' : 'Orange Money';
  const deliveryLabel = deliveryMethod === 'home' ? 'Livraison à domicile' : deliveryMethod === 'carrier' ? 'Transporteur' : "Retrait à l'atelier";
  const sellerWhatsapp = whatsappHref(listing.seller?.whatsappPhone ?? listing.seller?.phone, `Bonjour ${listing.seller?.name ?? ''}, je suis intéressé par votre annonce « ${listing.title} » sur ArtisanConnect.`);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.length ? images.map((image, index) => <button key={image} type="button" onClick={() => setZoomIndex(index)} className="group relative overflow-hidden rounded-lg bg-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-600"><img src={resolveMediaUrl(image)} alt={`${listing.title} ${index + 1}`} className="aspect-square w-full object-cover transition duration-200 group-hover:scale-105" /><span className="absolute bottom-2 right-2 rounded-md bg-stone-900/75 px-2 py-1 text-xs text-white">Agrandir</span></button>) : <div className="col-span-full flex h-64 items-center justify-center rounded-lg bg-stone-100 text-sm font-medium text-stone-500">{categoryLabel(listing.category)}</div>}
        </div>

        {zoomIndex !== null && images[zoomIndex] ? (
          <div role="dialog" aria-modal="true" aria-label="Aperçu agrandi" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setZoomIndex(null)}>
            <div className="relative flex max-h-[90vh] max-w-6xl items-center gap-3" onClick={(event) => event.stopPropagation()}>
              <button type="button" aria-label="Image précédente" onClick={() => setZoomIndex((index) => index === null ? null : (index - 1 + images.length) % images.length)} className="rounded-full bg-white/90 px-4 py-3 text-xl text-stone-900 shadow">‹</button>
              <img src={resolveMediaUrl(images[zoomIndex])} alt={`${listing.title} agrandie`} className="max-h-[85vh] max-w-[80vw] rounded-lg object-contain shadow-2xl" />
              <button type="button" aria-label="Image suivante" onClick={() => setZoomIndex((index) => index === null ? null : (index + 1) % images.length)} className="rounded-full bg-white/90 px-4 py-3 text-xl text-stone-900 shadow">›</button>
              <button type="button" aria-label="Fermer" onClick={() => setZoomIndex(null)} className="absolute -right-2 -top-12 rounded-full bg-white px-3 py-1 text-xl text-stone-900 shadow">×</button>
            </div>
          </div>
        ) : null}

        <span className="mt-6 inline-block text-xs uppercase tracking-wide text-stone-500">
          {categoryLabel(listing.category)} · {listing.type === 'service' ? 'Service' : 'Produit'}
        </span>
        <h1 className="mt-1 text-2xl font-semibold">{listing.title}</h1>
        <p className="mt-4 whitespace-pre-line text-stone-700">{listing.description}</p>

        {listing.seller && (
          <div className="mt-8 rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-500">Vendu par</p>
            <p className="font-medium">{listing.seller.name}</p>
            {listing.seller.location && (
              <p className="text-sm text-stone-600">{listing.seller.location}</p>
            )}
            <p className="mt-1 text-sm text-stone-600">
              {rating?.average
                ? `⭐ ${rating.average}/5 (${rating.count} avis)`
                : 'Pas encore d’avis'}
            </p>
            {user && !isOwnListing && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Link href={`/messages?to=${listing.sellerId}`} className="text-sm text-amber-700 underline">
                  Contacter l&apos;artisan par message
                </Link>
                {sellerWhatsapp ? <a href={sellerWhatsapp} target="_blank" rel="noreferrer" className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">WhatsApp</a> : null}
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="h-fit rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-3xl font-semibold">{formatXAF(listing.price)}</p>
        <p className="mt-1 text-sm text-stone-600">
          {listing.stock > 0 ? `${listing.stock} disponible(s)` : 'Rupture de stock'}
        </p>

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
              {acceptedPayments.includes('momo') && <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-orange-500">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="momo"
                  checked={paymentMethod === 'momo'}
                  onChange={() => setPaymentMethod('momo')}
                />
                <span>
                  <strong>Payer avec MoMo</strong>
                  <span className="block text-xs text-stone-500">Demande de paiement envoyée sur votre téléphone</span>
                </span>
              </label>}
              {acceptedPayments.includes('orange_money') && <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-orange-500">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="orange_money"
                  checked={paymentMethod === 'orange_money'}
                  onChange={() => setPaymentMethod('orange_money')}
                />
                <span>
                  <strong>Orange Money</strong>
                  <span className="block text-xs text-stone-500">Mode test local activé</span>
                </span>
              </label>}
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
              {acceptedDeliveries.includes('carrier') && <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-amber-600">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="carrier"
                  checked={deliveryMethod === 'carrier'}
                  onChange={() => setDeliveryMethod('carrier')}
                />
                <span>
                  <strong>Transporteur</strong>
                  <span className="block text-xs text-stone-500">Livraison suivie par un transporteur partenaire</span>
                </span>
              </label>}
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
            ? "Paiement en espèces à la remise. L'artisan confirmera la réception du règlement."
            : paymentMethod === 'momo'
              ? "Vous recevrez une demande de validation MoMo. Le paiement sera confirmé par webhook sécurisé."
              : "Orange Money reste disponible en mode test local."}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {isOwnListing ? (
          <p className="mt-6 text-center text-sm text-stone-500">
            Vous ne pouvez pas commander votre propre annonce.
          </p>
        ) : (
          <button
            onClick={handleOrder}
            disabled={ordering || listing.stock === 0 || !ready}
            className="mt-6 w-full rounded-md bg-amber-700 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
          >
            {ordering ? 'Commande en cours…' : user ? 'Commander' : 'Se connecter pour commander'}
          </button>
        )}
      </aside>
    </div>
  );
}

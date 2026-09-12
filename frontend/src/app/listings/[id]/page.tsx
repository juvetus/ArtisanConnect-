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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'orange_money'>('cash');
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

  const handleOrder = async () => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!listing) return;

    setOrdering(true);
    setError('');
    try {
      const order = await api.createOrder(listing.id, quantity, paymentMethod);
      if (paymentMethod === 'orange_money') {
        await api.confirmOrangeMoneyTest(order.id);
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
              <Link
                href={`/messages?to=${listing.sellerId}`}
                className="mt-3 inline-block text-sm text-amber-700 underline"
              >
                Contacter l&apos;artisan
              </Link>
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

        <fieldset className="mt-6 space-y-2">
          <legend className="text-sm font-medium">Mode de paiement</legend>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-amber-600">
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
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 p-3 text-sm hover:border-orange-500">
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
          </label>
        </fieldset>

        <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
          {paymentMethod === 'cash'
            ? "Paiement en espèces à la remise. L'artisan confirmera la réception du règlement."
            : "Simulation Orange Money : aucune transaction réelle n'est effectuée en mode test."}
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

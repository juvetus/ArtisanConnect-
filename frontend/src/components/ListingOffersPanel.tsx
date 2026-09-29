'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { formatXAF } from '@/lib/format';
import type { ListingOffer } from '@/lib/types';

function NegotiationMessage({ message, english }: { message: string; english: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = message.length > 220;

  return (
    <div className="mt-1">
      <p className="whitespace-pre-wrap text-stone-600">{isLong && !expanded ? `${message.slice(0, 220)}…` : message}</p>
      {isLong ? (
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)} className="mt-1 text-xs font-medium text-amber-800 underline">
          {expanded ? (english ? 'Show less' : 'Voir moins') : (english ? 'Show full message' : 'Voir le message complet')}
        </button>
      ) : null}
    </div>
  );
}

export function ListingOffersPanel({ audience }: { audience: 'buyer' | 'seller' }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const english = language === 'en';
  const sellerView = audience === 'seller';
  const canView = sellerView ? user?.role === 'artisan' : user?.role === 'client';
  const { data: offers, isLoading, mutate } = useSWR<ListingOffer[]>(
    canView ? [sellerView ? 'seller-listing-offers' : 'buyer-listing-offers', user?.id] : null,
    sellerView ? api.sellerListingOffers : api.buyerListingOffers,
    { refreshInterval: 30000 },
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [counterPrices, setCounterPrices] = useState<Record<string, string>>({});
  const [counterMessages, setCounterMessages] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  if (!canView) return null;

  const respond = async (offer: ListingOffer, action: 'accept' | 'reject' | 'counter') => {
    setBusyId(offer.id);
    setError('');
    try {
      if (action === 'accept') await api.acceptListingOffer(offer.id);
      else if (action === 'reject') await api.rejectListingOffer(offer.id);
      else {
        const unitPrice = Number(counterPrices[offer.id]);
        if (!Number.isInteger(unitPrice) || unitPrice < 1) throw new Error(english ? 'Enter a positive whole-number price.' : 'Saisissez un prix entier positif.');
        await api.counterListingOffer(offer.id, unitPrice, counterMessages[offer.id]?.trim() || undefined);
        setCounterPrices((current) => ({ ...current, [offer.id]: '' }));
        setCounterMessages((current) => ({ ...current, [offer.id]: '' }));
      }
      await mutate();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : (english ? 'Could not update this offer.' : 'Impossible de traiter cette offre.'));
    } finally {
      setBusyId(null);
    }
  };

  const statusLabel = (offer: ListingOffer) => {
    if (offer.status === 'accepted') return english ? 'Agreed' : 'Prix convenu';
    if (offer.status === 'rejected') return english ? 'Negotiation ended' : 'Négociation terminée';
    const myTurn = (sellerView && offer.lastProposedBy === 'buyer') || (!sellerView && offer.lastProposedBy === 'seller');
    if (myTurn) return english ? 'Your response needed' : 'Votre réponse attendue';
    return sellerView
      ? (english ? 'Waiting for buyer' : 'En attente de l’acheteur')
      : (english ? 'Waiting for seller' : 'En attente du vendeur');
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-stone-900">{sellerView ? (english ? 'Price offers received' : 'Offres de prix reçues') : (english ? 'My price offers' : 'Mes offres de prix')}</h2>
        <p className="mt-1 text-sm text-stone-600">{sellerView ? (english ? 'Accept, decline, or counter the buyer’s price. An order is created only when the other party accepts.' : 'Acceptez, refusez ou faites une contre-proposition. La commande ne sera créée qu’après acceptation du prix par l’autre partie.') : (english ? 'You and the seller can make counteroffers; the order is created only after one price is accepted.' : 'Vous et le vendeur pouvez échanger des contre-propositions; la commande ne sera créée qu’après acceptation d’un prix.')}</p>
      </div>
      {error ? <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {isLoading ? <p className="text-sm text-stone-500">{english ? 'Loading offers…' : 'Chargement des offres…'}</p> : null}
      {!isLoading && !offers?.length ? <p className="rounded-md border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">{sellerView ? (english ? 'No price offers received.' : 'Aucune offre de prix reçue.') : (english ? 'You have not made a price offer yet.' : 'Vous n’avez pas encore fait d’offre de prix.')}</p> : null}
      {offers?.map((offer) => {
        const isMyTurn = offer.status === 'pending' && ((sellerView && offer.lastProposedBy === 'seller') || (!sellerView && offer.lastProposedBy === 'buyer'));
        const canRespond = offer.status === 'pending' && !isMyTurn;
        return (
        <article key={offer.id} className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <Link href={`/listings/${offer.listingId}`} className="font-semibold text-stone-900 hover:text-amber-800">{offer.listing?.title ?? (english ? 'Listing unavailable' : 'Annonce indisponible')}</Link>
              <p className="mt-1 text-sm text-stone-600">{sellerView ? (english ? `Buyer: ${offer.buyer?.name ?? 'Buyer'}` : `Acheteur : ${offer.buyer?.name ?? 'Acheteur'}`) : (english ? `Seller: ${offer.seller?.name ?? 'Seller'}` : `Vendeur : ${offer.seller?.name ?? 'Vendeur'}`)} · {offer.quantity} × {formatXAF(offer.offeredUnitPrice)}</p>
              <p className="text-sm font-medium text-stone-800">{english ? 'Total offered' : 'Total proposé'} : {formatXAF(Number(offer.offeredUnitPrice) * offer.quantity)}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${offer.status === 'pending' ? 'bg-amber-100 text-amber-900' : offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-700'}`}>{statusLabel(offer)}</span>
          </div>
          {offer.negotiationHistory?.length ? (
            <details className="mt-3 rounded-md border border-stone-200 bg-stone-50 px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium text-stone-700">{english ? `Negotiation history (${offer.negotiationHistory.length})` : `Historique de négociation (${offer.negotiationHistory.length})`}</summary>
              <ol className="mt-3 space-y-3 border-l border-stone-300 pl-4">
                {offer.negotiationHistory.map((entry, index) => (
                  <li key={`${offer.id}-proposal-${index}`} className="text-sm">
                    <p className="font-medium text-stone-800">{entry.proposedBy === 'buyer' ? (english ? 'Buyer' : 'Acheteur') : (english ? 'Seller' : 'Vendeur')} · {formatXAF(entry.unitPrice)} {english ? 'per item' : 'par article'}</p>
                    {entry.message ? <NegotiationMessage message={entry.message} english={english} /> : null}
                    <time className="mt-1 block text-xs text-stone-500" dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString(english ? 'en-US' : 'fr-FR')}</time>
                  </li>
                ))}
              </ol>
            </details>
          ) : null}
          {isMyTurn ? <p className="mt-3 text-sm text-stone-600">{sellerView ? (english ? 'Waiting for the buyer’s response.' : 'En attente de la réponse de l’acheteur.') : (english ? 'Waiting for the seller’s response.' : 'En attente de la réponse du vendeur.')}</p> : null}
          {canRespond ? (
            <div className="mt-4 space-y-3 border-t border-stone-100 pt-3">
              <p className="text-sm font-medium text-stone-800">{english ? 'Respond to this proposal' : 'Répondre à cette proposition'}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium text-stone-700">
                  {english ? 'Counter price per item (FCFA)' : 'Votre contre-proposition par article (FCFA)'}
                  <input type="number" min="1" step="1" value={counterPrices[offer.id] ?? ''} onChange={(event) => setCounterPrices((current) => ({ ...current, [offer.id]: event.target.value }))} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-medium text-stone-700">
                  {english ? 'Message (optional)' : 'Message (facultatif)'}
                  <textarea rows={2} maxLength={500} value={counterMessages[offer.id] ?? ''} onChange={(event) => setCounterMessages((current) => ({ ...current, [offer.id]: event.target.value }))} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 font-normal" />
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void respond(offer, 'accept')} disabled={busyId === offer.id} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">{busyId === offer.id ? '…' : (english ? 'Accept and create order' : 'Accepter et créer la commande')}</button>
                <button type="button" onClick={() => void respond(offer, 'counter')} disabled={busyId === offer.id || !counterPrices[offer.id]} className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60">{english ? 'Send counteroffer' : 'Envoyer la contre-proposition'}</button>
                <button type="button" onClick={() => void respond(offer, 'reject')} disabled={busyId === offer.id} className="rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60">{english ? 'Decline negotiation' : 'Refuser la proposition'}</button>
              </div>
            </div>
          ) : null}
          {offer.status === 'accepted' && !sellerView ? <Link href="/orders" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">{english ? 'View order and payment' : 'Voir la commande et le paiement'}</Link> : null}
        </article>
        );
      })}
    </section>
  );
}

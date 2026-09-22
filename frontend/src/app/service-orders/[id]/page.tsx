'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ServiceOrder, ServicePayment, ServiceQuote, ServiceReview } from '@/lib/types';
import { whatsappHref } from '@/lib/whatsapp';

export default function ServiceOrderQuotePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, ready } = useAuth();
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [quote, setQuote] = useState<ServiceQuote | null>(null);
  const [payments, setPayments] = useState<ServicePayment[]>([]);
  const [myReview, setMyReview] = useState<ServiceReview | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [price, setPrice] = useState('');
  const [days, setDays] = useState('');
  const [details, setDetails] = useState('');
  const [terms, setTerms] = useState('Paiement selon les étapes convenues. Validité : 5 jours.');
  const [items, setItems] = useState([{ description: '', quantity: '1', unitPrice: '' }]);
  const [response, setResponse] = useState('');
  const [deliveryFeedback, setDeliveryFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const orderData = await api.getServiceOrder(params.id);
      setOrder(orderData as ServiceOrder);
      try {
        const quoteData = await api.getServiceQuote(params.id);
        setQuote((quoteData as ServiceQuote | null) || null);
      } catch (error) {
        setQuote(null);
        setNotice(error instanceof Error ? `Devis indisponible : ${error.message}` : 'Devis indisponible.');
      }
      try {
        setPayments((await api.getServiceOrderPayments(params.id)) as ServicePayment[]);
      } catch (error) {
        setPayments([]);
        setNotice(error instanceof Error ? `Paiements indisponibles : ${error.message}` : 'Paiements indisponibles.');
      }
      try {
        setMyReview((await api.getMyServiceReview(params.id)) as ServiceReview | null);
      } catch {
        setMyReview(null);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Demande introuvable.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user && params.id) void load();
  }, [ready, user, params.id]);

  const submitQuote = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await api.proposeServiceQuote(params.id, {
        proposedPrice: Number(price),
        proposedDays: Number(days),
        details,
        terms,
        items: items.filter((item) => item.description.trim() && item.unitPrice).map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) })),
      });
      setNotice('Devis envoyé au client.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’envoyer le devis.');
    } finally {
      setSubmitting(false);
    }
  };

  const respond = async (accepted: boolean) => {
    try {
      setSubmitting(true);
      await api.respondToServiceQuote(params.id, accepted, response);
      setNotice(accepted ? 'Devis accepté.' : 'Devis refusé.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’enregistrer votre réponse.');
    } finally {
      setSubmitting(false);
    }
  };

  const respondToDelivery = async (accepted: boolean) => {
    try {
      setSubmitting(true);
      await api.respondToServiceDelivery(params.id, accepted, deliveryFeedback);
      setNotice(accepted ? 'Livraison acceptée. La commande est terminée.' : 'Correction demandée à l’artisan.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’enregistrer votre retour.');
    } finally {
      setSubmitting(false);
    }
  };

  const pay = async (type: 'deposit' | 'balance') => {
    try {
      setSubmitting(true);
      await api.confirmServicePaymentTest(params.id, type);
      setNotice(type === 'deposit' ? 'Acompte confirmé.' : 'Solde confirmé.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Paiement impossible.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReview = async (event: FormEvent) => {
    event.preventDefault();
    try {
      setSubmitting(true);
      await api.createServiceReview({ orderId: params.id, rating: reviewRating, comment: reviewComment });
      setNotice('Votre avis a été enregistré.');
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’enregistrer l’avis.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready || !user) return <p className="text-stone-600">Connectez-vous pour consulter cette demande.</p>;
  if (loading) return <p className="text-stone-600">Chargement...</p>;
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <p className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
          {notice || 'Demande indisponible.'}
        </p>
        <Link href={user.role === 'artisan' ? '/artisan/service-orders' : '/'} className="text-sm font-medium text-amber-700 hover:text-amber-800">
          ← Retour aux demandes
        </Link>
      </div>
    );
  }

  const isArtisan = user.id === order.artisanId;
  const isClient = user.id === order.clientId;
  const canQuote = isArtisan && order.status === 'sent_to_artisan' && !quote;
  const canRespond = isClient && quote?.status === 'pending';
  // Chaque partie doit pouvoir joindre l'autre : le client appelle l'artisan, l'artisan appelle le client.
  const counterpart = isClient ? order.artisan : order.client;
  const counterpartWhatsapp = whatsappHref(
    counterpart?.whatsappPhone ?? counterpart?.phone,
    `Bonjour ${counterpart?.name ?? ''}, je vous contacte au sujet de la demande « ${order.service?.title ?? 'service'} » sur ArtisanConnect.`,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/" className="text-sm font-medium text-amber-700">← Accueil</Link>
      <header className="rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-sm uppercase tracking-wide text-amber-700">Demande de service</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">{order.service?.title}</h1>
        <p className="mt-2 text-sm text-stone-600">Statut : {order.status}</p>
        <p className="mt-1 text-sm text-stone-600">Livraison : {order.deliveryMethod === 'home' ? `À domicile${order.deliveryAddress ? ` - ${order.deliveryAddress}` : ''}` : order.deliveryMethod === 'carrier' ? 'Par notre transporteur' : 'Retrait à l’atelier'}</p>
        <p className="mt-4 whitespace-pre-wrap text-stone-700">{order.projectObjective}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href={`/messages?to=${user.id === order.clientId ? order.artisanId : order.clientId}&serviceOrderId=${order.id}`}
            className="rounded-md border border-amber-700 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            Ouvrir la messagerie de la commande
          </Link>
          {counterpartWhatsapp ? (
            <a
              href={counterpartWhatsapp}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {isClient ? 'Contacter l’artisan sur WhatsApp' : 'Contacter le client sur WhatsApp'}
            </a>
          ) : (
            <span className="text-sm text-stone-500">
              {isClient ? 'L’artisan n’a pas renseigné de numéro WhatsApp.' : 'Le client n’a pas renseigné de numéro WhatsApp.'}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-3">
          <button onClick={() => void api.downloadServiceOrderPdf(order.id)} className="text-sm font-medium text-stone-700 underline">Télécharger la commande PDF</button>
          {quote ? <button onClick={() => void api.downloadServiceQuotePdf(order.id)} className="text-sm font-medium text-stone-700 underline">Télécharger le devis PDF</button> : null}
        </div>
      </header>

      {notice ? <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p> : null}

      {canQuote ? (
        <form onSubmit={submitQuote} className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
          <div><h2 className="text-xl font-semibold text-stone-900">Proposer un devis</h2><p className="mt-1 text-sm text-stone-600">Le client aura cinq jours pour répondre.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor="price" className="block text-sm font-medium text-stone-700">Prix final (FCFA) *</label><input id="price" required type="number" min="1" value={price} onChange={(event) => setPrice(event.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
            <div><label htmlFor="days" className="block text-sm font-medium text-stone-700">Délai proposé (jours) *</label><input id="days" required type="number" min="1" value={days} onChange={(event) => setDays(event.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
          </div>
          <div><label className="block text-sm font-medium text-stone-700">Lignes de prestation *</label>{items.map((item, index) => <div key={index} className="mt-2 grid gap-2 sm:grid-cols-[1fr_100px_140px_auto]"><input required value={item.description} onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, description: event.target.value } : line))} placeholder="Prestation ou livrable" className="rounded-md border border-stone-300 px-3 py-2" /><input required type="number" min="1" value={item.quantity} onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, quantity: event.target.value } : line))} placeholder="Qté" className="rounded-md border border-stone-300 px-3 py-2" /><input required type="number" min="0" value={item.unitPrice} onChange={(event) => setItems((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, unitPrice: event.target.value } : line))} placeholder="Prix FCFA" className="rounded-md border border-stone-300 px-3 py-2" />{items.length > 1 ? <button type="button" onClick={() => setItems((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="rounded-md border border-stone-300 px-3 text-sm">×</button> : null}</div>)}<button type="button" onClick={() => setItems((current) => [...current, { description: '', quantity: '1', unitPrice: '' }])} className="mt-2 text-sm font-medium text-amber-700 underline">+ Ajouter une ligne</button></div>
          <div><label htmlFor="details" className="block text-sm font-medium text-stone-700">Détail des phases et livrables *</label><textarea id="details" required minLength={20} rows={4} value={details} onChange={(event) => setDetails(event.target.value)} placeholder="Phase 1 : cadrage...\nPhase 2 : réalisation..." className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
          <div><label htmlFor="terms" className="block text-sm font-medium text-stone-700">Conditions et validité</label><textarea id="terms" rows={3} value={terms} onChange={(event) => setTerms(event.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
          <button disabled={submitting} className="rounded-md bg-amber-700 px-5 py-2 font-medium text-white hover:bg-amber-800 disabled:bg-stone-400">{submitting ? 'Envoi...' : 'Envoyer le devis'}</button>
        </form>
      ) : null}

      {quote ? (
        <section className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold text-stone-900">Devis {quote.quoteNumber ?? ''} de {quote.artisan?.name || 'l’artisan'}</h2><p className="mt-1 text-sm text-stone-600">Statut : {quote.status}</p></div><p className="text-sm text-stone-500">Réponse avant le {new Date(quote.expiresAt).toLocaleDateString('fr-FR')}</p></div>
          {quote.items?.length ? <div className="overflow-x-auto"><table className="mt-4 w-full text-left text-sm"><thead><tr className="border-b border-stone-200"><th className="py-2">Prestation</th><th className="py-2">Qté</th><th className="py-2">Prix unitaire</th><th className="py-2">Total</th></tr></thead><tbody>{quote.items.map((item, index) => <tr key={`${item.description}-${index}`} className="border-b border-stone-100"><td className="py-2">{item.description}</td><td className="py-2">{item.quantity}</td><td className="py-2">{item.unitPrice.toLocaleString('fr-FR')} FCFA</td><td className="py-2 font-medium">{Math.round(item.quantity * item.unitPrice).toLocaleString('fr-FR')} FCFA</td></tr>)}</tbody></table></div> : null}
          <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-md bg-stone-50 p-4"><p className="text-xs uppercase text-stone-500">Prix final</p><p className="mt-1 text-xl font-semibold text-stone-900">{quote.proposedPrice} FCFA</p></div><div className="rounded-md bg-stone-50 p-4"><p className="text-xs uppercase text-stone-500">Délai</p><p className="mt-1 text-xl font-semibold text-stone-900">{quote.proposedDays} jours</p></div></div>
          <div><p className="text-sm font-medium text-stone-700">Phases et livrables</p><p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">{quote.details}</p></div>
          {quote.terms ? <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-600"><strong>Conditions :</strong> {quote.terms}</p> : null}
          {canRespond ? <div className="space-y-3 border-t border-stone-200 pt-5"><textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={3} placeholder="Message facultatif à l’artisan" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /><div className="flex gap-3"><button disabled={submitting} onClick={() => void respond(true)} className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:bg-stone-400">Accepter le devis</button><button disabled={submitting} onClick={() => void respond(false)} className="rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700 disabled:bg-stone-400">Refuser le devis</button></div></div> : null}
          {quote.clientResponse ? <p className="rounded-md bg-stone-50 p-3 text-sm text-stone-600">Réponse client : {quote.clientResponse}</p> : null}
        </section>
      ) : null}

      {isClient && payments.length ? (
        <section className="space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <div><h2 className="text-xl font-semibold text-stone-900">Paiements</h2><p className="mt-1 text-sm text-stone-600">Acompte de 30 %, puis solde de 70 % à la livraison.</p></div>
          <div className="grid gap-4 sm:grid-cols-2">
            {payments.map((payment) => (
              <div key={payment.id} className="rounded-md border border-amber-200 bg-white p-4">
                <p className="text-xs uppercase text-stone-500">{payment.type === 'deposit' ? 'Acompte 30 %' : 'Solde 70 %'}</p>
                <p className="mt-1 text-lg font-semibold text-stone-900">{payment.amount} FCFA</p>
                <p className="mt-1 text-sm text-stone-600">{payment.status === 'paid' ? 'Payé' : 'En attente'}</p>
                {payment.status === 'paid' ? <button onClick={() => void api.downloadServicePaymentPdf(order.id, payment.type)} className="mt-2 text-xs font-medium text-stone-700 underline">Télécharger le reçu</button> : null}
                {payment.status === 'pending' && ((payment.type === 'deposit' && order.status === 'accepted') || (payment.type === 'balance' && ['delivered', 'completed'].includes(order.status))) ? (
                  <button disabled={submitting} onClick={() => void pay(payment.type)} className="mt-3 rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:bg-stone-400">Payer en test</button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isClient && order.status === 'delivered' ? (
        <section className="space-y-5 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Valider la livraison</h2>
            <p className="mt-1 text-sm text-stone-600">Vérifiez les livrables avant de clôturer la commande.</p>
          </div>
          {order.fileUrls?.length ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-stone-700">Livrables</p>
              {order.fileUrls.map((fileUrl) => fileUrl.startsWith('/uploads/') || fileUrl.startsWith('/messages/files/') ? <button key={fileUrl} onClick={() => void api.downloadServiceAttachment(fileUrl, fileUrl.split('/').pop() || 'livrable')} className="block text-sm text-blue-700 underline">Télécharger {fileUrl.split('/').pop()}</button> : <a key={fileUrl} href={fileUrl} target="_blank" rel="noreferrer" className="block text-sm text-blue-700 underline">{fileUrl}</a>)}
            </div>
          ) : null}
          <textarea value={deliveryFeedback} onChange={(event) => setDeliveryFeedback(event.target.value)} rows={3} placeholder="Décrivez les corrections nécessaires si le travail n’est pas conforme" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm" />
          <div className="flex flex-wrap gap-3">
            <button disabled={submitting} onClick={() => void respondToDelivery(true)} className="rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700 disabled:bg-stone-400">Accepter la livraison</button>
            <button disabled={submitting || deliveryFeedback.trim().length < 10} onClick={() => void respondToDelivery(false)} className="rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700 disabled:bg-stone-400">Demander une correction</button>
          </div>
        </section>
      ) : null}

      {order.status === 'completed' ? <p className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">Commande terminée. Vous pouvez maintenant laisser un avis.</p> : null}
      {order.status === 'completed' && !myReview ? (
        <form onSubmit={submitReview} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-stone-900">Évaluer {isClient ? 'l’artisan' : 'le client'}</h2>
          <div><label htmlFor="reviewRating" className="block text-sm font-medium text-stone-700">Note *</label><select id="reviewRating" value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="mt-1 rounded-md border border-stone-300 px-3 py-2">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} étoile{rating > 1 ? 's' : ''}</option>)}</select></div>
          <div><label htmlFor="reviewComment" className="block text-sm font-medium text-stone-700">Commentaire {reviewRating <= 2 ? '*' : '(facultatif)'}</label><textarea id="reviewComment" required={reviewRating <= 2} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} rows={4} placeholder="Partagez votre expérience" className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2" /></div>
          <button disabled={submitting} className="rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 disabled:bg-stone-400">Publier l’avis</button>
        </form>
      ) : null}
      {order.status === 'completed' && myReview ? <p className="rounded-md bg-stone-50 px-4 py-3 text-sm text-stone-600">Votre avis a déjà été publié : {myReview.rating}/5.</p> : null}
      {order.status === 'in_progress' && order.deliveryFeedback ? <p className="rounded-md bg-orange-50 px-4 py-3 text-sm text-orange-800">Correction demandée : {order.deliveryFeedback}</p> : null}

      {!canQuote && !quote && isArtisan ? <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">Cette demande n’est pas encore disponible pour un devis.</p> : null}
      {!isArtisan && !isClient ? <p className="text-red-700">Cette demande ne vous concerne pas.</p> : null}
    </div>
  );
}

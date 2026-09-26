'use client';

import { FormEvent, Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { CUSTOMER_REQUEST_STATUS_LABELS } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';

export default function CustomerRequestsPage() {
  return (
    <Suspense fallback={<p className="text-stone-600">Chargement…</p>}>
      <CustomerRequestsContent />
    </Suspense>
  );
}

function CustomerRequestsContent() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const searchParams = useSearchParams();
  const { data: requests, mutate } = useSWR(user?.role === 'client' ? 'customer-requests' : null, api.getMyCustomerRequests, { refreshInterval: 10000, revalidateOnFocus: true });
  // Préremplissage depuis la fiche artisan : /customer-requests?category=&city=&neighborhood=
  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [neighborhood, setNeighborhood] = useState(searchParams.get('neighborhood') ?? '');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [contactPreference, setContactPreference] = useState<'platform' | 'whatsapp' | 'both'>('platform');
  const [contactPhone, setContactPhone] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [suggestingRequest, setSuggestingRequest] = useState(false);
  const [payment, setPayment] = useState<Record<string, { method: 'momo' | 'cash'; phone: string }>>({});

  const runPayment = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setNotice(success);
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Paiement impossible.');
    }
  };

  const decide = async (requestId: string, artisanId: string, decision: 'accepted' | 'rejected') => {    try {
      await api.decideCustomerRequestResponse(requestId, artisanId, decision);
      setNotice(decision === 'accepted' ? 'Proposition acceptée. Vous pouvez maintenant discuter avec l’artisan.' : 'Proposition refusée.');
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de traiter cette proposition.');
    }
  };

  const complete = async (requestId: string) => {
    try {
      await api.completeCustomerRequest(requestId);
      setNotice('Demande clôturée. Merci pour votre retour.');
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de clôturer cette demande.');
    }
  };

  const suggestRequest = async () => {
    if (!description.trim()) return;
    setSuggestingRequest(true);
    setNotice('');
    try {
      const result = await api.assistantSuggestClientRequest({
        description,
        category,
        city,
        neighborhood,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        language,
      });
      setDescription(result.content);
      setNotice('Suggestion préparée. Relisez et modifiez votre demande avant de la publier.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de préparer une suggestion.');
    } finally {
      setSuggestingRequest(false);
    }
  };

  if (!ready || !user) return <p className="text-stone-600">Connectez-vous pour publier une demande.</p>;

  type MyRequest = NonNullable<typeof requests>[number];
  const renderPayment = (request: MyRequest) => {
    const accepted = request.responses?.find((response) => response.status === 'accepted');
    if (!accepted || (request.status !== 'in_progress' && request.paymentStatus !== 'paid')) return null;
    const amount = accepted.price;
    const choice = payment[request.id] ?? { method: 'momo' as const, phone: user.phone ?? '' };
    if (request.paymentStatus === 'paid') return <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">Paiement de {request.paymentAmount} FCFA confirmé. Merci !</p>;
    if (!request.deliveredAt) return <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">Paiement : disponible dès que l’artisan aura déclaré le travail livré{amount ? ` (montant convenu : ${amount} FCFA)` : ''}.</p>;
    if (request.paymentStatus === 'pending' && request.paymentMethod === 'cash') return <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Paiement en espèces de {request.paymentAmount} FCFA : en attente de confirmation par l’artisan.</p>;
    if (request.paymentStatus === 'pending') return <div className="mt-4 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm"><p className="text-amber-900">Validez la demande de paiement MoMo de {request.paymentAmount} FCFA sur votre téléphone, puis vérifiez.</p><button type="button" onClick={() => void runPayment(() => api.confirmCustomerRequestMomo(request.id), 'Paiement vérifié.')} className="rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800">Vérifier le paiement</button></div>;
    return (
      <div className="mt-4 space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
        <p className="font-semibold text-stone-900">Travail livré : payer {amount} FCFA à {accepted.artisan?.name ?? 'l’artisan'}</p>
        <div className="flex flex-wrap gap-4">
          {([['momo', 'MTN MoMo'], ['cash', 'Espèces']] as const).map(([value, label]) => <label key={value} className="flex items-center gap-2"><input type="radio" name={`pay-${request.id}`} checked={choice.method === value} onChange={() => setPayment((current) => ({ ...current, [request.id]: { ...choice, method: value } }))} />{label}</label>)}
        </div>
        {choice.method === 'momo' ? <input type="tel" value={choice.phone} onChange={(event) => setPayment((current) => ({ ...current, [request.id]: { ...choice, phone: event.target.value } }))} placeholder="Numéro MoMo, ex. +237 6XX XXX XXX" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2" /> : <p className="text-stone-600">Remettez les espèces à l’artisan : il confirmera la réception.</p>}
        <button type="button" onClick={() => void runPayment(() => api.payCustomerRequest(request.id, { method: choice.method, payerPhone: choice.method === 'momo' ? choice.phone : undefined }), choice.method === 'momo' ? 'Demande de paiement MoMo envoyée. Validez-la sur votre téléphone.' : 'Paiement en espèces signalé à l’artisan.')} className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800">Payer {amount} FCFA</button>
      </div>
    );
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      const created = await api.createCustomerRequest({
        category,
        city,
        neighborhood,
        description,
        budgetMin: budgetMin ? Number(budgetMin) : undefined,
        budgetMax: budgetMax ? Number(budgetMax) : undefined,
        requestedDate: requestedDate || undefined,
        contactPreference,
        contactPhone: contactPreference === 'platform' ? undefined : contactPhone,
      });
      // L'envoi des photos est secondaire : une erreur ici ne doit pas perdre la demande.
      if (photos.length && created?.id) {
        try {
          await api.uploadCustomerRequestPhotos(created.id, photos);
        } catch {
          setNotice('Demande publiée, mais les photos n’ont pas pu être envoyées.');
        }
      }
      trackEvent('quote_form_opened', { label: category, city });
      setDescription('');
      setBudgetMin('');
      setBudgetMax('');
      setRequestedDate('');
      setPhotos([]);
      setNotice((current) => current || 'Votre demande a été publiée. Des artisans compatibles pourront vous répondre.');
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de publier la demande.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Je cherche un artisan</h1>
        <p className="mt-2 text-stone-600">Décrivez votre besoin et laissez des artisans du Cameroun vous proposer une solution.</p>
      </header>
      <form onSubmit={submit} className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-xs text-stone-600"><span className="text-red-700" aria-hidden="true">*</span> Champ obligatoire</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="request-category" className="block text-sm font-medium text-stone-700">Métier ou catégorie *</label><input id="request-category" required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Menuiserie, couture, plomberie..." className="field mt-1" /></div>
          <div><label htmlFor="request-city" className="block text-sm font-medium text-stone-700">Ville *</label><input id="request-city" required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Douala, Yaoundé..." className="field mt-1" /></div>
        </div>
        <div><label htmlFor="request-neighborhood" className="block text-sm font-medium text-stone-700">Quartier</label><input id="request-neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="field mt-1" /></div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="request-description" className="block text-sm font-medium text-stone-700">Décrivez votre besoin *</label>
            <button type="button" disabled={!description.trim() || suggestingRequest} onClick={() => void suggestRequest()} className="rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-50">
              {suggestingRequest ? 'Préparation…' : 'Améliorer avec l’IA'}
            </button>
          </div>
          <textarea id="request-description" required minLength={20} rows={7} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Décrivez le travail, les dimensions, les matériaux et le résultat attendu..." className="field mt-1" />
          <p className="mt-1 text-xs text-stone-500">La suggestion reste modifiable et n’est pas publiée automatiquement.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="request-min" className="block text-sm font-medium text-stone-700">Budget minimum (FCFA)</label><input id="request-min" type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} className="field mt-1" /></div><div><label htmlFor="request-max" className="block text-sm font-medium text-stone-700">Budget maximum (FCFA)</label><input id="request-max" type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} className="field mt-1" /></div></div>

        <div>
          <label htmlFor="request-date" className="block text-sm font-medium text-stone-700">Délai souhaité</label>
          <input id="request-date" type="date" min={new Date().toISOString().split('T')[0]} value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} className="field mt-1" />
          <p className="mt-1 text-xs text-stone-500">Date à laquelle vous souhaitez que le travail soit terminé.</p>
        </div>

        <div>
          <label htmlFor="request-photos" className="block text-sm font-medium text-stone-700">Photos du besoin</label>
          <input
            id="request-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 5))}
            className="mt-1 block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-amber-800"
          />
          <p className="mt-1 text-xs text-stone-500">
            {photos.length ? `${photos.length} photo(s) sélectionnée(s)` : '5 photos maximum, 5 Mo chacune. Un artisan chiffre bien mieux avec des images.'}
          </p>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-stone-700">Comment souhaitez-vous être contacté ?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([
              ['platform', 'Messagerie ArtisanConnect'],
              ['whatsapp', 'WhatsApp'],
              ['both', 'Les deux'],
            ] as const).map(([value, label]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${contactPreference === value ? 'border-amber-700 bg-amber-50' : 'border-stone-200'}`}>
                <input type="radio" name="contact-preference" value={value} checked={contactPreference === value} onChange={() => setContactPreference(value)} />
                {label}
              </label>
            ))}
          </div>
          {contactPreference !== 'platform' ? (
            <div className="mt-3">
              <label htmlFor="request-phone" className="block text-sm font-medium text-stone-700">Numéro WhatsApp *</label>
              <input id="request-phone" required type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+237..." className="field mt-1" />
              <p className="mt-1 text-xs text-stone-500">Ce numéro n’est transmis qu’aux artisans destinataires de votre demande.</p>
            </div>
          ) : null}
        </fieldset>
        {notice ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p> : null}
        <button disabled={saving} className="rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60">{saving ? 'Publication...' : 'Publier ma demande'}</button>
      </form>
      <section className="space-y-3"><h2 className="text-xl font-semibold text-stone-900">Mes demandes</h2>{requests?.length ? requests.map((request) => <article key={request.id} className="rounded-lg border border-stone-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{request.category} · {request.city}</h3><div className="flex items-center gap-3"><span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">{CUSTOMER_REQUEST_STATUS_LABELS[request.status] ?? request.status}</span>{request.status !== 'completed' ? <button onClick={() => void complete(request.id)} className="text-xs font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800">Marquer comme terminée</button> : null}</div></div><p className="mt-2 text-sm text-stone-600">{request.description}</p>{request.adminReply ? <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm"><p className="font-semibold text-blue-900">Réponse de l’équipe ArtisanConnect{request.adminRepliedAt ? ` · ${new Date(request.adminRepliedAt).toLocaleString('fr-FR')}` : ''}</p><p className="mt-1 whitespace-pre-wrap text-blue-900">{request.adminReply}</p></div> : null}{request.responses?.length ? <div className="mt-4 space-y-3 border-t border-stone-100 pt-4"><h4 className="text-sm font-semibold text-stone-900">Réponses des artisans</h4>{request.responses.map((response, index) => { const href = whatsappHref(response.artisan?.whatsappPhone ?? response.artisan?.phone, `Bonjour ${response.artisan?.name ?? 'artisan'}, je réponds à votre proposition pour ma demande ${request.category} à ${request.city} sur ArtisanConnect.`); const decided = response.status === 'accepted' || response.status === 'rejected'; return <div key={`${request.id}-${index}`} className="rounded-md bg-stone-50 p-3 text-sm"><p className="font-medium">{response.artisan?.name ?? 'Artisan'}{response.price ? ` · ${response.price} FCFA` : ''}{response.days ? ` · ${response.days} jours` : ''}</p><p className="mt-1 text-stone-600">{response.message}</p><p className="mt-2 text-xs uppercase text-stone-500">{response.status === 'accepted' ? 'Proposition acceptée' : response.status === 'rejected' ? 'Proposition refusée' : 'En attente de votre décision'}</p>{!decided ? <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void decide(request.id, response.artisanId, 'accepted')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Accepter</button><button onClick={() => void decide(request.id, response.artisanId, 'rejected')} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Refuser</button><Link href={`/messages?to=${response.artisanId}&customerRequestId=${request.id}`} className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">Discuter</Link></div> : null}{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">Contacter sur WhatsApp</a> : null}</div>; })}</div> : null}{renderPayment(request)}</article>) : <p className="text-sm text-stone-600">Aucune demande publiée pour le moment.</p>}</section>
    </div>
  );
}

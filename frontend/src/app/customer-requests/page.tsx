'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { whatsappHref } from '@/lib/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { CUSTOMER_REQUEST_STATUS_LABELS } from '@/lib/types';
import { useLanguage } from '@/lib/language-context';
import { DEMO_MODE } from '@/lib/demo-mode';
import { DemoBadge } from '@/components/DemoBadge';
import { MOBILE_MONEY_ENABLED } from '@/lib/pilot-capabilities';
import { formatXAF } from '@/lib/format';

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
  const english = language === 'en';
  const searchParams = useSearchParams();
  const { data: requests, mutate } = useSWR(user?.role === 'client' ? 'customer-requests' : null, api.getMyCustomerRequests, {
    refreshInterval: 10000,
    revalidateOnFocus: true,
  });

  const [category, setCategory] = useState(searchParams.get('category') ?? '');
  const [city, setCity] = useState(searchParams.get('city') ?? '');
  const [neighborhood, setNeighborhood] = useState(searchParams.get('neighborhood') ?? '');
  const [requestType, setRequestType] = useState<'personal' | 'business'>('personal');
  const [organizationName, setOrganizationName] = useState('');
  const [requestedQuantity, setRequestedQuantity] = useState('');
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
  const [expandedResponses, setExpandedResponses] = useState<Record<string, boolean>>({});
  const [collapsedRequests, setCollapsedRequests] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user?.role === 'client') {
      trackEvent('quote_form_opened');
    }
  }, [user?.role]);

  if (DEMO_MODE) {
    return (
      <div role="status" className="mx-auto max-w-3xl space-y-4 rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <DemoBadge />
        <h1 className="text-2xl font-semibold">{english ? 'Demo marketplace' : 'Marketplace de démonstration'}</h1>
        <p className="text-sm">{english ? 'All products and services shown are examples. Quote requests are disabled until real offers are available.' : 'Les produits et services affichés sont des exemples. Les demandes de devis sont désactivées jusqu’à la publication d’offres réelles.'}</p>
        <Link href="/services" className="inline-flex rounded-md bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900">{english ? 'Browse demo services' : 'Voir les services de démonstration'}</Link>
      </div>
    );
  }

  const runPayment = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      setNotice(success);
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Payment failed.' : 'Paiement impossible.'));
    }
  };

  const decide = async (requestId: string, artisanId: string, decision: 'accepted' | 'rejected') => {
    try {
      await api.decideCustomerRequestResponse(requestId, artisanId, decision);
      setNotice(decision === 'accepted' ? (english ? 'Offer accepted. You can now discuss the project with the artisan.' : 'Proposition acceptée. Vous pouvez maintenant discuter avec l’artisan.') : (english ? 'Offer declined.' : 'Proposition refusée.'));
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not process this offer.' : 'Impossible de traiter cette proposition.'));
    }
  };

  const complete = async (requestId: string) => {
    try {
      await api.completeCustomerRequest(requestId);
      setNotice(english ? 'Request completed. Thank you for your feedback.' : 'Demande clôturée. Merci pour votre retour.');
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not complete this request.' : 'Impossible de clôturer cette demande.'));
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
        requestType,
        organizationName: requestType === 'business' ? organizationName : undefined,
        requestedQuantity: requestType === 'business' ? Number(requestedQuantity) : undefined,
        language,
      });
      setDescription(result.content);
      setNotice(english ? 'Suggestion ready. Review and edit your request before publishing.' : 'Suggestion préparée. Relisez et modifiez votre demande avant de la publier.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not prepare a suggestion.' : 'Impossible de préparer une suggestion.'));
    } finally {
      setSuggestingRequest(false);
    }
  };

  if (!ready || !user) return <p className="text-stone-600">Connectez-vous pour publier une demande.</p>;

  if (user.role === 'artisan') {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-2xl font-semibold text-stone-900">Les demandes sont réservées aux clients</h1>
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          En tant qu’artisan, vous ne pouvez pas publier une demande pour chercher un autre artisan. Consultez plutôt les opportunités clients et répondez aux demandes qui correspondent à votre métier.
        </p>
        <Link href="/artisan/customer-requests" className="inline-flex rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800">
          Voir les opportunités
        </Link>
      </div>
    );
  }

  if (user.role === 'institution') {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="text-2xl font-semibold text-stone-900">Contactez-nous pour un partenariat</h1>
        <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          La publication d’une demande pour trouver un artisan est réservée aux clients. Les institutions peuvent nous contacter pour organiser un programme ou un partenariat avec les artisans.
        </p>
        <Link href="/contact" className="inline-flex rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800">Contacter ArtisanConnect</Link>
      </div>
    );
  }

  type MyRequest = NonNullable<typeof requests>[number];

  const statusLabel = (status: string) => english
    ? ({ new: 'New', contacted: 'Artisans contacted', in_progress: 'In progress', completed: 'Completed' }[status] ?? status)
    : (CUSTOMER_REQUEST_STATUS_LABELS[status as keyof typeof CUSTOMER_REQUEST_STATUS_LABELS] ?? status);

  const renderPayment = (request: MyRequest) => {
    const accepted = request.responses?.find((response) => response.status === 'accepted');
    if (!accepted || (request.status !== 'in_progress' && request.paymentStatus !== 'paid')) return null;

    const amount = accepted.price;
    const choice = payment[request.id] ?? { method: MOBILE_MONEY_ENABLED ? 'momo' as const : 'cash' as const, phone: user.phone ?? '' };

    if (request.paymentStatus === 'paid') {
      return <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm font-medium text-green-800">{english ? `Payment of ${request.paymentAmount} XAF confirmed. Thank you!` : `Paiement de ${request.paymentAmount} FCFA confirmé. Merci !`}</p>;
    }
    if (!request.deliveredAt) {
      return <p className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700">{english ? `Payment will be available after the artisan marks the work as delivered${amount ? ` (agreed amount: ${amount} XAF)` : ''}.` : `Paiement : disponible dès que l’artisan aura déclaré le travail livré${amount ? ` (montant convenu : ${amount} FCFA)` : ''}.`}</p>;
    }
    if (request.paymentStatus === 'pending' && request.paymentMethod === 'cash') {
      return <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{english ? `Cash payment of ${request.paymentAmount} XAF: waiting for the artisan to confirm receipt.` : `Paiement en espèces de ${request.paymentAmount} FCFA : en attente de confirmation par l’artisan.`}</p>;
    }
    if (request.paymentStatus === 'pending') {
      return (
        <div className="mt-4 space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="text-amber-900">{!MOBILE_MONEY_ENABLED ? (english ? 'Mobile payment coming soon. Please settle this payment directly with the artisan.' : 'Paiement mobile bientôt disponible. Veuillez régler directement avec l’artisan.') : english ? `Approve the MoMo payment request for ${request.paymentAmount} XAF on your phone, then verify it.` : `Validez la demande de paiement MoMo de ${request.paymentAmount} FCFA sur votre téléphone, puis vérifiez.`}</p>
          {MOBILE_MONEY_ENABLED ? <button type="button" onClick={() => void runPayment(() => api.confirmCustomerRequestMomo(request.id), english ? 'Payment verified.' : 'Paiement vérifié.')} className="rounded-md bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800">{english ? 'Verify payment' : 'Vérifier le paiement'}</button> : null}
        </div>
      );
    }

    return (
      <div className="mt-4 space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm">
        <p className="font-semibold text-stone-900">{english ? `Work delivered: pay ${amount} XAF to ${accepted.artisan?.name ?? 'the artisan'}` : `Travail livré : payer ${amount} FCFA à ${accepted.artisan?.name ?? 'l’artisan'}`}</p>
        <div className="flex flex-wrap gap-4">
          {([['momo', 'MTN MoMo'], ['cash', english ? 'Cash' : 'Espèces']] as const).map(([value, label]) => (
            <label key={value} className={`flex items-center gap-2 ${value === 'momo' && !MOBILE_MONEY_ENABLED ? 'cursor-not-allowed text-stone-500' : 'cursor-pointer'}`}>
              <input type="radio" name={`pay-${request.id}`} checked={choice.method === value} disabled={value === 'momo' && !MOBILE_MONEY_ENABLED} onChange={() => setPayment((current) => ({ ...current, [request.id]: { ...choice, method: value } }))} />
              {label}{value === 'momo' && !MOBILE_MONEY_ENABLED ? ` — ${english ? 'coming soon' : 'bientôt disponible'}` : ''}
            </label>
          ))}
        </div>
        {choice.method === 'momo' ? (
          <input type="tel" value={choice.phone} onChange={(event) => setPayment((current) => ({ ...current, [request.id]: { ...choice, phone: event.target.value } }))} placeholder={english ? 'MoMo number, e.g. +237 6XX XXX XXX' : 'Numéro MoMo, ex. +237 6XX XXX XXX'} className="w-full rounded-md border border-stone-300 bg-white px-3 py-2" />
        ) : (
          <p className="text-stone-600">{english ? 'Give the cash to the artisan; they will confirm receipt.' : 'Remettez les espèces à l’artisan : il confirmera la réception.'}</p>
        )}
        <button type="button" onClick={() => void runPayment(() => api.payCustomerRequest(request.id, { method: choice.method, payerPhone: choice.method === 'momo' ? choice.phone : undefined }), choice.method === 'momo' ? (english ? 'MoMo request sent. Approve it on your phone.' : 'Demande de paiement MoMo envoyée. Validez-la sur votre téléphone.') : (english ? 'Cash payment reported to the artisan.' : 'Paiement en espèces signalé à l’artisan.'))} disabled={choice.method === 'momo' && !MOBILE_MONEY_ENABLED} className="rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-stone-400">{english ? `Pay ${amount} XAF` : `Payer ${amount} FCFA`}</button>
      </div>
    );
  };

  const renderResponseComparison = (request: MyRequest) => {
    const responses = request.responses ?? [];
    const contactedCount = Math.max(request.contactedArtisanIds?.length ?? 0, responses.length);
    const waitingCount = Math.max(0, contactedCount - responses.length);
    const acceptedResponse = responses.find((response) => response.status === 'accepted');

    return (
      <section className="mt-4 overflow-hidden rounded-md border border-stone-200" aria-label={english ? 'Quote comparison' : 'Comparaison des propositions'}>
        <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-50 px-3 py-2">
          <h4 className="text-sm font-semibold text-stone-900">{english ? 'Quote comparison' : 'Comparaison des propositions'}</h4>
          <p className="text-xs text-stone-600">
            {english
              ? `${contactedCount} contacted · ${responses.length} ${responses.length === 1 ? 'reply' : 'replies'} · ${waitingCount} waiting`
              : `${contactedCount} sollicité(s) · ${responses.length} réponse(s) · ${waitingCount} en attente`}
          </p>
        </div>
        {responses.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="bg-stone-50 text-xs font-medium text-stone-500">
                <tr>
                  <th scope="col" className="px-3 py-2">{english ? 'Artisan' : 'Artisan'}</th>
                  <th scope="col" className="px-3 py-2">{english ? 'Price' : 'Prix'}</th>
                  <th scope="col" className="px-3 py-2">{english ? 'Lead time' : 'Délai'}</th>
                  <th scope="col" className="px-3 py-2">{english ? 'Decision' : 'Décision'}</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((response) => (
                  <tr key={response.artisanId} className="border-t border-stone-100 align-top">
                    <th scope="row" className="px-3 py-2 font-medium text-stone-800">{response.artisan?.name ?? (english ? 'Artisan' : 'Artisan')}</th>
                    <td className="px-3 py-2 text-stone-700">{response.price != null ? formatXAF(Number(response.price)) : (english ? 'To discuss' : 'À convenir')}</td>
                    <td className="px-3 py-2 text-stone-700">{response.days ? (english ? `${response.days} days` : `${response.days} jours`) : '—'}</td>
                    <td className="px-3 py-2 text-stone-600">
                      {response.status === 'accepted'
                        ? (english ? 'Accepted' : 'Acceptée')
                        : response.status === 'rejected'
                          ? (english ? 'Declined' : 'Refusée')
                          : (english ? 'Awaiting decision' : 'En attente')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-3 py-3 text-sm text-stone-600">
            {contactedCount
              ? (english ? 'No offer received yet. You will see replies here.' : 'Aucune proposition reçue pour le moment. Les réponses apparaîtront ici.')
              : request.requestType === 'business'
                ? (english ? 'Your brief is awaiting review before artisans are contacted.' : 'Votre brief attend une vérification avant la sollicitation des artisans.')
                : (english ? 'No matching artisan has been contacted yet. The team may follow up.' : 'Aucun artisan correspondant n’a encore été sollicité. L’équipe pourra effectuer un suivi.')}
          </p>
        )}
        {acceptedResponse ? (
          <p className="border-t border-emerald-100 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            {english
              ? 'You selected this offer. Confirm the handover and cash-payment arrangements directly with the artisan during the pilot.'
              : 'Vous avez retenu cette proposition. Convenez directement avec l’artisan des modalités de remise et du règlement en espèces pendant le pilote.'}
          </p>
        ) : null}
      </section>
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
        requestType,
        organizationName: requestType === 'business' ? organizationName : undefined,
        requestedQuantity: requestType === 'business' ? Number(requestedQuantity) : undefined,
      });

      if (photos.length && created?.id) {
        try {
          await api.uploadCustomerRequestPhotos(created.id, photos);
        } catch {
          setNotice('Demande publiée, mais les photos n’ont pas pu être envoyées.');
        }
      }

      setDescription('');
      setBudgetMin('');
      setBudgetMax('');
      setRequestedDate('');
      setOrganizationName('');
      setRequestedQuantity('');
      setPhotos([]);
      setNotice((current) => current || (english ? 'Your request has been published. Matching artisans can now reply.' : 'Votre demande a été publiée. Des artisans compatibles pourront vous répondre.'));
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not publish the request.' : 'Impossible de publier la demande.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{english ? 'Find an artisan' : 'Je cherche un artisan'}</h1>
        <p className="mt-2 text-stone-600">{english ? 'Describe what you need and let artisans in Cameroon suggest a solution.' : 'Décrivez votre besoin et laissez des artisans du Cameroun vous proposer une solution.'}</p>
      </header>

      <form onSubmit={submit} className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-xs text-stone-600"><span className="text-red-700" aria-hidden="true">*</span> {english ? 'Required field' : 'Champ obligatoire'}</p>
        <fieldset>
          <legend className="block text-sm font-medium text-stone-700">{english ? 'Who is this request for?' : 'Pour qui est cette demande ?'}</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {([
              ['personal', english ? 'Personal' : 'Particulier'],
              ['business', english ? 'Business / B2B' : 'Entreprise / B2B'],
            ] as const).map(([value, label]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 text-sm ${requestType === value ? 'border-amber-700 bg-amber-50' : 'border-stone-200'}`}>
                <input type="radio" name="request-type" value={value} checked={requestType === value} onChange={() => setRequestType(value)} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        {requestType === 'business' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="request-organization" className="block text-sm font-medium text-stone-700">{english ? 'Company or organization *' : 'Entreprise ou organisation *'}</label>
              <input id="request-organization" required value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="field mt-1" />
            </div>
            <div>
              <label htmlFor="request-quantity" className="block text-sm font-medium text-stone-700">{english ? 'Quantity needed *' : 'Quantité souhaitée *'}</label>
              <input id="request-quantity" required type="number" min="1" step="1" value={requestedQuantity} onChange={(event) => setRequestedQuantity(event.target.value)} className="field mt-1" />
            </div>
            <p className="text-xs text-stone-500 sm:col-span-2">{english ? 'Your brief will be reviewed by the ArtisanConnect team before selected artisans are contacted.' : 'Votre brief sera vérifié par l’équipe ArtisanConnect avant la sélection des artisans à contacter.'}</p>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="request-category" className="block text-sm font-medium text-stone-700">{english ? 'Trade or category *' : 'Métier ou catégorie *'}</label><input id="request-category" required value={category} onChange={(event) => setCategory(event.target.value)} placeholder={english ? 'Carpentry, sewing, plumbing…' : 'Menuiserie, couture, plomberie…'} className="field mt-1" /></div>
          <div><label htmlFor="request-city" className="block text-sm font-medium text-stone-700">{english ? 'City *' : 'Ville *'}</label><input id="request-city" required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Douala, Yaoundé…" className="field mt-1" /></div>
        </div>
        <div><label htmlFor="request-neighborhood" className="block text-sm font-medium text-stone-700">{english ? 'Neighborhood' : 'Quartier'}</label><input id="request-neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="field mt-1" /></div>
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="request-description" className="block text-sm font-medium text-stone-700">{english ? 'Describe what you need *' : 'Décrivez votre besoin *'}</label>
            <button type="button" disabled={!description.trim() || suggestingRequest} onClick={() => void suggestRequest()} className="rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-50">
              {suggestingRequest ? (english ? 'Preparing…' : 'Préparation…') : (english ? 'Improve with AI' : 'Améliorer avec l’IA')}
            </button>
          </div>
          <textarea id="request-description" required minLength={20} rows={7} value={description} onChange={(event) => setDescription(event.target.value)} placeholder={english ? 'Describe the work, dimensions, materials and expected result…' : 'Décrivez le travail, les dimensions, les matériaux et le résultat attendu…'} className="field mt-1" />
          <p className="mt-1 text-xs text-stone-500">{english ? 'You can edit the suggestion; it will not be published automatically.' : 'La suggestion reste modifiable et n’est pas publiée automatiquement.'}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="request-min" className="block text-sm font-medium text-stone-700">{english ? 'Minimum budget (XAF)' : 'Budget minimum (FCFA)'}</label><input id="request-min" type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} className="field mt-1" /></div><div><label htmlFor="request-max" className="block text-sm font-medium text-stone-700">{english ? 'Maximum budget (XAF)' : 'Budget maximum (FCFA)'}</label><input id="request-max" type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} className="field mt-1" /></div></div>

        <div>
          <label htmlFor="request-date" className="block text-sm font-medium text-stone-700">{english ? 'Requested deadline' : 'Délai souhaité'}</label>
          <input id="request-date" type="date" min={new Date().toISOString().split('T')[0]} value={requestedDate} onChange={(event) => setRequestedDate(event.target.value)} className="field mt-1" />
          <p className="mt-1 text-xs text-stone-500">{english ? 'When you would like the work to be completed.' : 'Date à laquelle vous souhaitez que le travail soit terminé.'}</p>
        </div>

        <div>
          <label htmlFor="request-photos" className="block text-sm font-medium text-stone-700">{english ? 'Photos of your request' : 'Photos du besoin'}</label>
          <input
            id="request-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => setPhotos(Array.from(event.target.files ?? []).slice(0, 5))}
            className="mt-1 block w-full text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-amber-800"
          />
          <p className="mt-1 text-xs text-stone-500">
            {photos.length ? (english ? `${photos.length} photo(s) selected` : `${photos.length} photo(s) sélectionnée(s)`) : (english ? 'Up to 5 photos, 5 MB each. Images help artisans prepare a quote.' : '5 photos maximum, 5 Mo chacune. Un artisan chiffre bien mieux avec des images.')}
          </p>
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-stone-700">{english ? 'How would you like to be contacted?' : 'Comment souhaitez-vous être contacté ?'}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([
              ['platform', english ? 'ArtisanConnect messaging' : 'Messagerie ArtisanConnect'],
              ['whatsapp', 'WhatsApp'],
              ['both', english ? 'Both' : 'Les deux'],
            ] as const).map(([value, label]) => (
              <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-md border p-3 text-sm ${contactPreference === value ? 'border-amber-700 bg-amber-50' : 'border-stone-200'}`}>
                <input type="radio" name="contact-preference" value={value} checked={contactPreference === value} onChange={() => setContactPreference(value)} />
                {label}
              </label>
            ))}
          </div>
          {contactPreference !== 'platform' ? (
            <div className="mt-3">
              <label htmlFor="request-phone" className="block text-sm font-medium text-stone-700">{english ? 'WhatsApp number *' : 'Numéro WhatsApp *'}</label>
              <input id="request-phone" required type="tel" value={contactPhone} onChange={(event) => setContactPhone(event.target.value)} placeholder="+237..." className="field mt-1" />
              <p className="mt-1 text-xs text-stone-500">{english ? 'This number is shared only with artisans selected for your request.' : 'Ce numéro n’est transmis qu’aux artisans destinataires de votre demande.'}</p>
            </div>
          ) : null}
        </fieldset>

        {notice ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p> : null}
        <button disabled={saving} className="rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60">{saving ? (english ? 'Publishing…' : 'Publication…') : (english ? 'Publish my request' : 'Publier ma demande')}</button>
      </form>

      {english ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-stone-900">My requests</h2>
          {requests?.length ? requests.map((request) => {
            const collapsed = collapsedRequests[request.id] ?? false;
            return (
            <article key={request.id} className="rounded-lg border border-stone-200 bg-white p-5">
              <button
                type="button"
                onClick={() => setCollapsedRequests((current) => ({ ...current, [request.id]: !collapsed }))}
                aria-expanded={!collapsed}
                className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
              >
                <h3 className="font-semibold">{request.category} · {request.city}</h3>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">{statusLabel(request.status)}</span>
                  <svg className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {!collapsed ? (
              <>
              {request.requestType === 'business' ? <p className="text-xs font-medium text-amber-800">{english ? 'Business brief' : 'Brief professionnel'} · {request.organizationName} · {request.requestedQuantity} {english ? 'units' : 'unités'}</p> : null}

              <p className="mt-2 text-sm text-stone-600">{request.description}</p>

              {request.adminReply ? (
                <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                  <p className="font-semibold text-blue-900">ArtisanConnect team reply</p>
                  <p className="mt-1 whitespace-pre-wrap text-blue-900">{request.adminReply}</p>
                </div>
              ) : null}

              {renderResponseComparison(request)}
              {request.responses?.length ? (
                <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                  <h4 className="text-sm font-semibold text-stone-900">Artisan responses</h4>
                  {request.responses.map((response, index) => {
                    const responseKey = `${request.id}-${index}`;
                    const isExpanded = expandedResponses[responseKey] ?? false;
                    const message = response.message ?? '';
                    const preview = message.length > 260 && !isExpanded ? `${message.slice(0, 260)}...` : message;

                    return (
                      <div key={responseKey} className="rounded-md bg-stone-50 p-3 text-sm">
                        <p className="font-medium">
                          {response.artisan?.name ?? 'Artisan'}
                          {response.price ? ` · ${response.price} XAF` : ''}
                          {response.days ? ` · ${response.days} days` : ''}
                        </p>

                        {message ? (
                          <div className="mt-1">
                            <p className="whitespace-pre-wrap text-stone-600">{preview}</p>
                            {message.length > 260 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedResponses((current) => ({ ...current, [responseKey]: !isExpanded }))}
                                className="mt-2 text-xs font-medium text-amber-800 underline"
                              >
                                {isExpanded ? 'Show less' : 'Show more'}
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        <p className="mt-2 text-xs uppercase text-stone-500">
                          {response.status === 'accepted' ? 'Offer accepted' : response.status === 'rejected' ? 'Offer declined' : 'Waiting for your decision'}
                        </p>

                        {response.status !== 'accepted' && response.status !== 'rejected' ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => void decide(request.id, response.artisanId, 'accepted')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white">Accept</button>
                            <button onClick={() => void decide(request.id, response.artisanId, 'rejected')} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700">Decline</button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {request.status !== 'completed' ? (
                <button onClick={() => void complete(request.id)} className="mt-4 text-xs font-medium text-stone-500 underline">Mark as completed</button>
              ) : null}
              </>
              ) : null}
            </article>
            );
          }) : <p className="text-sm text-stone-600">No requests published yet.</p>}
        </section>
      ) : null}

      {!english && (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-stone-900">Mes demandes</h2>
          {requests?.length ? requests.map((request) => {
            const collapsed = collapsedRequests[request.id] ?? false;
            return (
            <article key={request.id} className="rounded-lg border border-stone-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCollapsedRequests((current) => ({ ...current, [request.id]: !collapsed }))}
                  aria-expanded={!collapsed}
                  className="flex items-center gap-2 text-left"
                >
                  <svg className={`h-4 w-4 shrink-0 text-stone-500 transition-transform ${collapsed ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                  <h3 className="font-semibold">{request.category} · {request.city}</h3>
                </button>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-700">{CUSTOMER_REQUEST_STATUS_LABELS[request.status] ?? request.status}</span>
                  {request.status !== 'completed' ? (
                    <button onClick={() => void complete(request.id)} className="text-xs font-medium text-stone-500 underline underline-offset-4 hover:text-stone-800">Marquer comme terminée</button>
                  ) : null}
                </div>
              </div>

              {!collapsed ? (
              <>
              {request.requestType === 'business' ? <p className="text-xs font-medium text-amber-800">Brief professionnel · {request.organizationName} · {request.requestedQuantity} unités</p> : null}

              <p className="mt-2 text-sm text-stone-600">{request.description}</p>

              {request.adminReply ? (
                <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
                  <p className="font-semibold text-blue-900">Réponse de l’équipe ArtisanConnect{request.adminRepliedAt ? ` · ${new Date(request.adminRepliedAt).toLocaleString('fr-FR')}` : ''}</p>
                  <p className="mt-1 whitespace-pre-wrap text-blue-900">{request.adminReply}</p>
                </div>
              ) : null}

              {renderResponseComparison(request)}
              {request.responses?.length ? (
                <div className="mt-4 space-y-3 border-t border-stone-100 pt-4">
                  <h4 className="text-sm font-semibold text-stone-900">Réponses des artisans</h4>
                  {request.responses.map((response, index) => {
                    const responseKey = `${request.id}-${index}`;
                    const href = whatsappHref(response.artisan?.whatsappPhone ?? response.artisan?.phone, `Bonjour ${response.artisan?.name ?? 'artisan'}, je réponds à votre proposition pour ma demande ${request.category} à ${request.city} sur ArtisanConnect (réf. ${request.id.slice(0, 8)}).`);
                    const decided = response.status === 'accepted' || response.status === 'rejected';
                    const isExpanded = expandedResponses[responseKey] ?? false;
                    const message = response.message ?? '';
                    const preview = message.length > 260 && !isExpanded ? `${message.slice(0, 260)}...` : message;

                    return (
                      <div key={responseKey} className="rounded-md bg-stone-50 p-3 text-sm">
                        <p className="font-medium">
                          {response.artisan?.name ?? 'Artisan'}
                          {response.price ? ` · ${response.price} FCFA` : ''}
                          {response.days ? ` · ${response.days} jours` : ''}
                        </p>

                        {message ? (
                          <div className="mt-2">
                            <p className="whitespace-pre-wrap text-stone-600">{preview}</p>
                            {message.length > 260 ? (
                              <button
                                type="button"
                                onClick={() => setExpandedResponses((current) => ({ ...current, [responseKey]: !isExpanded }))}
                                className="mt-2 text-xs font-medium text-amber-800 underline"
                              >
                                {isExpanded ? 'Voir moins' : 'Voir plus'}
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {response.status === 'accepted' ? (
                          <p className="mt-3 rounded-sm bg-emerald-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">Proposition acceptée</p>
                        ) : response.status === 'rejected' ? (
                          <p className="mt-3 rounded-sm bg-red-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-800">Proposition refusée</p>
                        ) : (
                          <p className="mt-3 rounded-sm bg-amber-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">En attente de votre décision</p>
                        )}

                        {!decided ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button onClick={() => void decide(request.id, response.artisanId, 'accepted')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Accepter</button>
                            <button onClick={() => void decide(request.id, response.artisanId, 'rejected')} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Refuser</button>
                          </div>
                        ) : null}

                        {href ? (
                          <a href={href} target="_blank" rel="noreferrer" onClick={() => trackEvent('whatsapp_click', { targetId: request.id, label: request.category, city: request.city })} className="mt-3 inline-flex rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">Contacter sur WhatsApp</a>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
              </>
              ) : null}
            </article>
            );
          }) : <p className="text-sm text-stone-600">Aucune demande publiée pour le moment.</p>}
        </section>
      )}
    </div>
  );
}

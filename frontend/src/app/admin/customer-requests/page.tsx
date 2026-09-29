'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

type UnmatchedRequest = NonNullable<Awaited<ReturnType<typeof api.getAdminUnmatchedCustomerRequests>>>[number];
type FollowUpRequest = NonNullable<Awaited<ReturnType<typeof api.getAdminRequestsAwaitingResponses>>>[number];

export default function AdminCustomerRequestsPage() {
  const { user, ready } = useAuth();
  const { language } = useLanguage();
  const english = language === 'en';
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Record<string, { id: string; name?: string | null; location?: string | null }[]>>({});
  const [selectedArtisans, setSelectedArtisans] = useState<Record<string, string[]>>({});
  const [candidateLoadingId, setCandidateLoadingId] = useState<string | null>(null);
  const [followUpSendingId, setFollowUpSendingId] = useState<string | null>(null);
  const { data: requests, isLoading, mutate } = useSWR(
    user?.role === 'admin' ? 'admin-unmatched-customer-requests' : null,
    api.getAdminUnmatchedCustomerRequests,
  );
  const { data: followUps, isLoading: followUpsLoading, mutate: mutateFollowUps } = useSWR(
    user?.role === 'admin' ? 'admin-customer-request-follow-ups' : null,
    api.getAdminRequestsAwaitingResponses,
    { refreshInterval: 60000 },
  );

  useEffect(() => {
    if (ready && user?.role !== 'admin') router.replace('/');
  }, [ready, user, router]);

  const sendReply = async (request: UnmatchedRequest) => {
    const message = (drafts[request.id] ?? '').trim();
    if (!message) return;
    setSendingId(request.id);
    setNotice('');
    try {
      await api.replyToUnmatchedCustomerRequest(request.id, message);
      setDrafts((current) => ({ ...current, [request.id]: '' }));
      setNotice(english ? `Reply sent to ${request.client?.name ?? 'the client'}.` : `Réponse envoyée à ${request.client?.name ?? 'la cliente ou au client'}.`);
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'The reply could not be sent.' : 'La réponse n’a pas pu être envoyée.'));
    } finally {
      setSendingId(null);
    }
  };

  const loadCandidates = async (request: UnmatchedRequest) => {
    setCandidateLoadingId(request.id);
    setNotice('');
    try {
      const result = await api.getBusinessRequestArtisanCandidates(request.id);
      setCandidates((current) => ({ ...current, [request.id]: result }));
      setSelectedArtisans((current) => ({ ...current, [request.id]: current[request.id] ?? [] }));
      if (!result.length) setNotice(english ? 'No active matching artisans were found. Reply to the company with next steps.' : 'Aucun artisan actif correspondant. Répondez à l’entreprise pour lui indiquer la suite.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not load artisan suggestions.' : 'Impossible de charger les artisans suggérés.'));
    } finally {
      setCandidateLoadingId(null);
    }
  };

  const assignArtisans = async (request: UnmatchedRequest) => {
    const artisanIds = selectedArtisans[request.id] ?? [];
    if (!artisanIds.length) return;
    setSendingId(request.id);
    setNotice('');
    try {
      await api.assignBusinessRequestArtisans(request.id, artisanIds);
      setNotice(english ? `${artisanIds.length} artisan(s) contacted for this brief.` : `${artisanIds.length} artisan(s) sélectionné(s) pour ce brief.`);
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not assign the selected artisans.' : 'Impossible d’assigner les artisans sélectionnés.'));
    } finally {
      setSendingId(null);
    }
  };

  const remindArtisans = async (request: FollowUpRequest) => {
    setFollowUpSendingId(request.id);
    setNotice('');
    try {
      const result = await api.remindAdminRequestArtisans(request.id);
      setNotice(english
        ? `Reminder sent to ${result.notifiedCount} artisan(s).`
        : `Relance envoyée à ${result.notifiedCount} artisan(s).`);
      await mutateFollowUps();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : (english ? 'Could not send the reminder.' : 'Impossible d’envoyer la relance.'));
    } finally {
      setFollowUpSendingId(null);
    }
  };

  if (!ready || user?.role !== 'admin') return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{english ? 'Administration' : 'Administration'}</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">{english ? 'Customer request follow-up' : 'Suivi des demandes clients'}</h1>
        <p className="mt-2 text-sm text-stone-600">{english ? 'Handle unmatched requests and B2B briefs, and remind artisans when a targeted request has waited over 24 hours.' : 'Traitez les demandes sans correspondant et les briefs B2B; relancez les artisans lorsqu’une demande ciblée attend depuis plus de 24 heures.'}</p>
      </header>
      {notice ? <p role="status" className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">{notice}</p> : null}
      {isLoading ? <p className="text-sm text-stone-600">{english ? 'Loading requests…' : 'Chargement des demandes…'}</p> : null}
      {!isLoading && !requests?.length ? <p className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">{english ? 'No unmatched requests to handle.' : 'Aucune demande sans artisan à traiter.'}</p> : null}
      <div className="space-y-4">
        {requests?.map((request) => (
          <article key={request.id} className="space-y-4 border-b border-stone-200 bg-white py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{request.category} · {request.city}{request.neighborhood ? ` · ${request.neighborhood}` : ''}</p>
                {request.requestType === 'business' ? <p className="mt-1 text-sm font-semibold text-amber-800">{english ? 'B2B brief' : 'Brief B2B'} · {request.organizationName} · {request.requestedQuantity} {english ? 'units' : 'unités'}</p> : null}
                <h2 className="mt-1 text-lg font-semibold text-stone-900">{request.client?.name ?? 'Client'}{request.client?.email ? <span className="ml-2 text-sm font-normal text-stone-500">{request.client.email}</span> : null}</h2>
                <p className="mt-1 text-xs text-stone-500">{english ? 'Received' : 'Reçue le'} {new Date(request.createdAt).toLocaleString(english ? 'en-US' : 'fr-FR')}</p>
              </div>
              {request.budgetMax ? <p className="text-sm text-stone-600">{english ? 'Budget' : 'Budget'} : {request.budgetMin ?? 0}–{request.budgetMax} FCFA</p> : null}
            </div>
            <p className="whitespace-pre-wrap text-sm text-stone-700">{request.description}</p>
            {request.requestType === 'business' && (request.contactedArtisanIds?.length ?? 0) > 0 ? (
              <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {english ? `Brief sent to ${request.contactedArtisanIds?.length} selected artisan(s).` : `Brief transmis à ${request.contactedArtisanIds?.length} artisan(s) sélectionné(s).`}
              </p>
            ) : null}
            {request.requestType === 'business' && !(request.contactedArtisanIds?.length) ? (
              <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/50 p-4">
                <div>
                  <h3 className="text-sm font-semibold text-stone-900">{english ? 'Review and select artisans' : 'Vérifier le brief et sélectionner des artisans'}</h3>
                  <p className="mt-1 text-xs text-stone-600">{english ? 'Suggested artisans are ranked by trade, location, availability and profile signals. You choose who receives this brief.' : 'Les suggestions tiennent compte du métier, de la localisation, de la disponibilité et du profil. Vous choisissez qui reçoit le brief.'}</p>
                </div>
                {!candidates[request.id]?.length ? (
                  <button type="button" disabled={candidateLoadingId === request.id} onClick={() => void loadCandidates(request)} className="rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 disabled:opacity-50">
                    {candidateLoadingId === request.id ? (english ? 'Finding matches…' : 'Recherche des correspondances…') : (english ? 'Load suggested artisans' : 'Charger les artisans suggérés')}
                  </button>
                ) : (
                  <>
                    <div className="space-y-2">
                      {candidates[request.id].map((artisan) => {
                        const selected = (selectedArtisans[request.id] ?? []).includes(artisan.id);
                        return (
                          <label key={artisan.id} className="flex cursor-pointer items-center gap-3 rounded-md border border-stone-200 bg-white p-3 text-sm">
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={!selected && (selectedArtisans[request.id] ?? []).length >= 5}
                              onChange={() => setSelectedArtisans((current) => {
                                const currentIds = current[request.id] ?? [];
                                return { ...current, [request.id]: selected ? currentIds.filter((id) => id !== artisan.id) : [...currentIds, artisan.id] };
                              })}
                            />
                            <span className="font-medium text-stone-900">{artisan.name ?? (english ? 'Artisan' : 'Artisan')}</span>
                            {artisan.location ? <span className="text-stone-500">{artisan.location}</span> : null}
                          </label>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={!(selectedArtisans[request.id] ?? []).length || sendingId === request.id} onClick={() => void assignArtisans(request)} className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50">
                        {english ? `Contact selected (${(selectedArtisans[request.id] ?? []).length}/5)` : `Contacter la sélection (${(selectedArtisans[request.id] ?? []).length}/5)`}
                      </button>
                      <button type="button" onClick={() => setCandidates((current) => ({ ...current, [request.id]: [] }))} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700">
                        {english ? 'Reload suggestions' : 'Recharger les suggestions'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
            {request.adminReply ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                <p className="font-semibold text-green-900">{english ? 'Reply sent' : 'Réponse envoyée le'} {request.adminRepliedAt ? new Date(request.adminRepliedAt).toLocaleString(english ? 'en-US' : 'fr-FR') : ''}</p>
                <p className="mt-1 whitespace-pre-wrap text-green-900">{request.adminReply}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor={`reply-${request.id}`} className="block text-sm font-medium text-stone-700">{english ? 'Your reply to the client' : 'Votre réponse au client'}</label>
                <textarea id={`reply-${request.id}`} rows={3} value={drafts[request.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [request.id]: event.target.value }))} placeholder={english ? 'Explain next steps or ask for more details…' : 'Expliquez les prochaines étapes ou demandez des précisions…'} className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
                <button type="button" disabled={!drafts[request.id]?.trim() || sendingId === request.id} onClick={() => void sendReply(request)} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">{sendingId === request.id ? (english ? 'Sending…' : 'Envoi…') : (english ? 'Send reply' : 'Envoyer la réponse')}</button>
              </div>
            )}
          </article>
        ))}
      </div>

      <section className="space-y-3 border-t border-stone-200 pt-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-stone-900">{english ? 'Waiting for artisan replies (24h+)' : 'En attente de réponse (24 h et plus)'}</h2>
          <p className="text-xs text-stone-500">{english ? 'A reminder can be sent once every 24 hours per artisan and request.' : 'Une relance est possible toutes les 24 h par artisan et par demande.'}</p>
        </div>
        {followUpsLoading ? <p className="text-sm text-stone-600">{english ? 'Loading follow-ups…' : 'Chargement des relances…'}</p> : null}
        {!followUpsLoading && !followUps?.length ? <p className="rounded-md border border-stone-200 bg-white p-4 text-sm text-stone-600">{english ? 'No targeted requests are waiting for a reply.' : 'Aucune demande ciblée n’attend actuellement de réponse.'}</p> : null}
        <div className="space-y-3">
          {followUps?.map((request) => {
            const recentlyReminded = request.pendingArtisanIds.length - request.relaunchableArtisanIds.length;
            return (
              <article key={request.id} className="space-y-3 border-b border-stone-200 bg-white py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{request.category} · {request.city}{request.neighborhood ? ` · ${request.neighborhood}` : ''}</p>
                    <h3 className="mt-1 font-semibold text-stone-900">{request.client?.name ?? (english ? 'Client' : 'Client')}</h3>
                    <p className="mt-1 text-xs text-stone-500">{english ? `Waiting over 24 hours · received ${new Date(request.createdAt).toLocaleString('en-US')}` : `En attente depuis plus de 24 h · reçue le ${new Date(request.createdAt).toLocaleString('fr-FR')}`}</p>
                  </div>
                  <p className="text-sm font-medium text-stone-700">
                    {english
                      ? `${request.responses.length} reply/replies · ${request.pendingArtisanIds.length} awaiting`
                      : `${request.responses.length} réponse(s) · ${request.pendingArtisanIds.length} en attente`}
                  </p>
                </div>
                <p className="whitespace-pre-wrap text-sm text-stone-700">{request.description}</p>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-stone-600">
                    {english ? 'Awaiting: ' : 'En attente : '}
                    {request.pendingArtisans.map((artisan) => artisan.name ?? (english ? 'Artisan' : 'Artisan')).join(', ')}
                    {recentlyReminded > 0 ? ` · ${english ? `${recentlyReminded} reminded recently` : `${recentlyReminded} déjà relancé(s), délai de 24 h en cours`}` : ''}
                  </p>
                  <button
                    type="button"
                    disabled={!request.relaunchableArtisanIds.length || followUpSendingId === request.id}
                    onClick={() => void remindArtisans(request)}
                    className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600"
                  >
                    {followUpSendingId === request.id
                      ? (english ? 'Sending…' : 'Envoi…')
                      : request.relaunchableArtisanIds.length
                        ? (english ? `Remind ${request.relaunchableArtisanIds.length} artisan(s)` : `Relancer ${request.relaunchableArtisanIds.length} artisan(s)`)
                        : (english ? 'Recently reminded' : 'Déjà relancé')}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

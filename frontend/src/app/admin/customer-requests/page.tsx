'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type UnmatchedRequest = NonNullable<Awaited<ReturnType<typeof api.getAdminUnmatchedCustomerRequests>>>[number];

export default function AdminCustomerRequestsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const { data: requests, isLoading, mutate } = useSWR(
    user?.role === 'admin' ? 'admin-unmatched-customer-requests' : null,
    api.getAdminUnmatchedCustomerRequests,
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
      setNotice(`Réponse envoyée à ${request.client?.name ?? 'la cliente ou au client'}.`);
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'La réponse n’a pas pu être envoyée.');
    } finally {
      setSendingId(null);
    }
  };

  if (!ready || user?.role !== 'admin') return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Administration</p>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">Demandes sans artisan correspondant</h1>
        <p className="mt-2 text-sm text-stone-600">Répondez directement aux clients lorsqu’aucun artisan compatible n’a été trouvé.</p>
      </header>
      {notice ? <p role="status" className="rounded-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">{notice}</p> : null}
      {isLoading ? <p className="text-sm text-stone-600">Chargement des demandes…</p> : null}
      {!isLoading && !requests?.length ? <p className="rounded-md border border-stone-200 bg-white p-5 text-sm text-stone-600">Aucune demande sans artisan à traiter.</p> : null}
      <div className="space-y-4">
        {requests?.map((request) => (
          <article key={request.id} className="space-y-4 border-b border-stone-200 bg-white py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{request.category} · {request.city}{request.neighborhood ? ` · ${request.neighborhood}` : ''}</p>
                <h2 className="mt-1 text-lg font-semibold text-stone-900">{request.client?.name ?? 'Client'}{request.client?.email ? <span className="ml-2 text-sm font-normal text-stone-500">{request.client.email}</span> : null}</h2>
                <p className="mt-1 text-xs text-stone-500">Reçue le {new Date(request.createdAt).toLocaleString('fr-FR')}</p>
              </div>
              {request.budgetMax ? <p className="text-sm text-stone-600">Budget : {request.budgetMin ?? 0}–{request.budgetMax} FCFA</p> : null}
            </div>
            <p className="whitespace-pre-wrap text-sm text-stone-700">{request.description}</p>
            {request.adminReply ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm">
                <p className="font-semibold text-green-900">Réponse envoyée le {request.adminRepliedAt ? new Date(request.adminRepliedAt).toLocaleString('fr-FR') : ''}</p>
                <p className="mt-1 whitespace-pre-wrap text-green-900">{request.adminReply}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label htmlFor={`reply-${request.id}`} className="block text-sm font-medium text-stone-700">Votre réponse au client</label>
                <textarea id={`reply-${request.id}`} rows={3} value={drafts[request.id] ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Expliquez les prochaines étapes ou demandez des précisions…" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
                <button type="button" disabled={!drafts[request.id]?.trim() || sendingId === request.id} onClick={() => void sendReply(request)} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50">{sendingId === request.id ? 'Envoi…' : 'Envoyer la réponse'}</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

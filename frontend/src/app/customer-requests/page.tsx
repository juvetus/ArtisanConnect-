'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { whatsappHref } from '@/lib/whatsapp';

export default function CustomerRequestsPage() {
  const { user, ready } = useAuth();
  const { data: requests, mutate } = useSWR(user?.role === 'client' ? 'customer-requests' : null, api.getMyCustomerRequests, { refreshInterval: 10000, revalidateOnFocus: true });
  const [category, setCategory] = useState('');
  const [city, setCity] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [description, setDescription] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const decide = async (requestId: string, artisanId: string, decision: 'accepted' | 'rejected') => {
    try {
      await api.decideCustomerRequestResponse(requestId, artisanId, decision);
      setNotice(decision === 'accepted' ? 'Proposition acceptée. Vous pouvez maintenant discuter avec l’artisan.' : 'Proposition refusée.');
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de traiter cette proposition.');
    }
  };

  if (!ready || !user) return <p className="text-stone-600">Connectez-vous pour publier une demande.</p>;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');
    try {
      await api.createCustomerRequest({ category, city, neighborhood, description, budgetMin: budgetMin ? Number(budgetMin) : undefined, budgetMax: budgetMax ? Number(budgetMax) : undefined });
      setDescription('');
      setBudgetMin('');
      setBudgetMax('');
      setNotice('Votre demande a été publiée. Des artisans compatibles pourront vous répondre.');
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
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="request-category" className="block text-sm font-medium text-stone-700">Métier ou catégorie *</label><input id="request-category" required value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Menuiserie, couture, plomberie..." className="field mt-1" /></div>
          <div><label htmlFor="request-city" className="block text-sm font-medium text-stone-700">Ville *</label><input id="request-city" required value={city} onChange={(event) => setCity(event.target.value)} placeholder="Douala, Yaoundé..." className="field mt-1" /></div>
        </div>
        <div><label htmlFor="request-neighborhood" className="block text-sm font-medium text-stone-700">Quartier</label><input id="request-neighborhood" value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} className="field mt-1" /></div>
        <div><label htmlFor="request-description" className="block text-sm font-medium text-stone-700">Décrivez votre besoin *</label><textarea id="request-description" required minLength={20} rows={7} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Décrivez le travail, les dimensions, les matériaux et le résultat attendu..." className="field mt-1" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label htmlFor="request-min" className="block text-sm font-medium text-stone-700">Budget minimum (FCFA)</label><input id="request-min" type="number" min="0" value={budgetMin} onChange={(event) => setBudgetMin(event.target.value)} className="field mt-1" /></div><div><label htmlFor="request-max" className="block text-sm font-medium text-stone-700">Budget maximum (FCFA)</label><input id="request-max" type="number" min="0" value={budgetMax} onChange={(event) => setBudgetMax(event.target.value)} className="field mt-1" /></div></div>
        {notice ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p> : null}
        <button disabled={saving} className="rounded-md bg-amber-700 px-5 py-2.5 font-medium text-white hover:bg-amber-800 disabled:opacity-60">{saving ? 'Publication...' : 'Publier ma demande'}</button>
      </form>
      <section className="space-y-3"><h2 className="text-xl font-semibold text-stone-900">Mes demandes</h2>{requests?.length ? requests.map((request) => <article key={request.id} className="rounded-lg border border-stone-200 bg-white p-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="font-semibold">{request.category} · {request.city}</h3><span className="text-xs uppercase text-stone-500">{request.status}</span></div><p className="mt-2 text-sm text-stone-600">{request.description}</p>{request.responses?.length ? <div className="mt-4 space-y-3 border-t border-stone-100 pt-4"><h4 className="text-sm font-semibold text-stone-900">Réponses des artisans</h4>{request.responses.map((response, index) => { const href = whatsappHref(response.artisan?.whatsappPhone ?? response.artisan?.phone, `Bonjour ${response.artisan?.name ?? 'artisan'}, je réponds à votre proposition pour ma demande ${request.category} à ${request.city} sur ArtisanConnect.`); const decided = response.status === 'accepted' || response.status === 'rejected'; return <div key={`${request.id}-${index}`} className="rounded-md bg-stone-50 p-3 text-sm"><p className="font-medium">{response.artisan?.name ?? 'Artisan'}{response.price ? ` · ${response.price} FCFA` : ''}{response.days ? ` · ${response.days} jours` : ''}</p><p className="mt-1 text-stone-600">{response.message}</p><p className="mt-2 text-xs uppercase text-stone-500">{response.status === 'accepted' ? 'Proposition acceptée' : response.status === 'rejected' ? 'Proposition refusée' : 'En attente de votre décision'}</p>{!decided ? <div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void decide(request.id, response.artisanId, 'accepted')} className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700">Accepter</button><button onClick={() => void decide(request.id, response.artisanId, 'rejected')} className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">Refuser</button><Link href={`/messages?to=${response.artisanId}&customerRequestId=${request.id}`} className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50">Discuter</Link></div> : null}{href ? <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-flex rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">Contacter sur WhatsApp</a> : null}</div>; })}</div> : null}</article>) : <p className="text-sm text-stone-600">Aucune demande publiée pour le moment.</p>}</section>
    </div>
  );
}

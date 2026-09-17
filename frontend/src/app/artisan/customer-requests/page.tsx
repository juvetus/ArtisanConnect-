'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type RequestItem = { id: string; category: string; city: string; neighborhood?: string | null; description: string; budgetMin?: number | null; budgetMax?: number | null; status: string; matchScore?: number };

export default function ArtisanCustomerRequestsPage() {
  const { user, ready } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const { data: requests, mutate } = useSWR<RequestItem[]>(user?.role === 'artisan' ? ['open-customer-requests', categoryFilter, cityFilter] : null, ([, category, city]) => api.getOpenCustomerRequests({ category: String(category), city: String(city) }));
  const [form, setForm] = useState<Record<string, { price: string; days: string; message: string }>>({});
  const [notice, setNotice] = useState('');

  if (!ready || !user) return <p className="text-stone-600">Connectez-vous pour consulter les opportunités.</p>;

  const respond = async (request: RequestItem) => {
    const values = form[request.id] ?? { price: '', days: '', message: '' };
    try {
      await api.respondToCustomerRequest(request.id, { price: values.price ? Number(values.price) : undefined, days: values.days ? Number(values.days) : undefined, message: values.message });
      setNotice('Votre réponse a été envoyée au client.');
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible d’envoyer la réponse.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header><p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p><h1 className="mt-1 text-3xl font-semibold text-stone-900">Opportunités clients</h1><p className="mt-2 text-stone-600">Découvrez les demandes ouvertes et répondez aux projets qui correspondent à votre savoir-faire.</p></header>
      {notice ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2"><input value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} placeholder="Filtrer par métier" className="rounded-md border border-stone-300 px-3 py-2 text-sm" /><input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder="Filtrer par ville" className="rounded-md border border-stone-300 px-3 py-2 text-sm" /></div>
      {!requests?.length ? <p className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-600">Aucune demande ouverte pour le moment.</p> : <div className="space-y-5">{requests.map((request) => { const values = form[request.id] ?? { price: '', days: '', message: '' }; return <article key={request.id} className="space-y-4 rounded-lg border border-stone-200 bg-white p-6"><div className="flex flex-wrap justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium uppercase tracking-wide text-amber-700">{request.category}</p>{typeof request.matchScore === 'number' && request.matchScore > 0 ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Correspondance {request.matchScore}%</span> : null}</div><h2 className="mt-1 text-xl font-semibold text-stone-900">Projet à {request.city}</h2>{request.neighborhood ? <p className="text-sm text-stone-500">{request.neighborhood}</p> : null}</div>{request.budgetMax ? <p className="text-sm text-stone-600">Budget : {request.budgetMin ?? 0} - {request.budgetMax} FCFA</p> : null}</div><p className="whitespace-pre-wrap text-stone-700">{request.description}</p><div className="grid gap-3 sm:grid-cols-3"><input type="number" min="1" placeholder="Prix proposé (FCFA)" value={values.price} onChange={(event) => setForm((current) => ({ ...current, [request.id]: { ...values, price: event.target.value } }))} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /><input type="number" min="1" placeholder="Délai (jours)" value={values.days} onChange={(event) => setForm((current) => ({ ...current, [request.id]: { ...values, days: event.target.value } }))} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /><input placeholder="Votre message" value={values.message} onChange={(event) => setForm((current) => ({ ...current, [request.id]: { ...values, message: event.target.value } }))} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /></div><button onClick={() => void respond(request)} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">Répondre au client</button></article>; })}</div>}
    </div>
  );
}
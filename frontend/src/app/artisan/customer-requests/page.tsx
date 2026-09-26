'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

type MyResponse = { price?: number; days?: number; message: string; status?: 'accepted' | 'rejected'; updatedAt?: string };
type RequestItem = { id: string; category: string; city: string; neighborhood?: string | null; description: string; budgetMin?: number | null; budgetMax?: number | null; requestedDate?: string | null; fileUrls?: string[] | null; status: string; createdAt: string; matchScore?: number; targeted?: boolean; alreadyAnswered?: boolean; awarded?: boolean; awardedToMe?: boolean; myResponse?: MyResponse | null };

export default function ArtisanCustomerRequestsPage() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const { data: requests, mutate } = useSWR<RequestItem[]>(user?.role === 'artisan' ? ['open-customer-requests', categoryFilter, cityFilter] : null, ([, category, city]) => api.getOpenCustomerRequests({ category: String(category), city: String(city) }), { refreshInterval: 30000 });
  const [form, setForm] = useState<Record<string, { price: string; days: string; message: string }>>({});
  const [notice, setNotice] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  if (!ready || !user) return <p className="text-stone-600">{t('opportunities_login')}</p>;

  const isPending = (request: RequestItem) => !request.alreadyAnswered && !request.awarded;
  const byNewest = (first: RequestItem, second: RequestItem) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
  const allRequests = requests ?? [];
  const pendingRequests = allRequests.filter(isPending).sort(byNewest);
  const sections = [
    { key: 'pending', title: `À traiter (${pendingRequests.length})`, hint: 'Demandes auxquelles vous n’avez pas encore répondu, les plus récentes en premier.', items: pendingRequests, collapsed: false },
    { key: 'answered', title: 'Vos offres en cours', hint: '', items: allRequests.filter((request) => request.alreadyAnswered && (!request.awarded || request.awardedToMe)).sort(byNewest), collapsed: false },
    { key: 'taken', title: 'Offres déjà pourvues', hint: '', items: allRequests.filter((request) => request.awarded && !request.awardedToMe).sort(byNewest), collapsed: true },
  ].filter((section) => section.items.length);
  const formatDateTime = (value: string) => new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  const elapsed = (value: string) => {
    const minutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60000));
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.round(minutes / 60);
    return hours < 24 ? `il y a ${hours} h` : `il y a ${Math.round(hours / 24)} j`;
  };

  const startEditing = (request: RequestItem) => {
    const current = request.myResponse;
    setForm((previous) => ({ ...previous, [request.id]: { price: current?.price !== undefined ? String(current.price) : '', days: current?.days ? String(current.days) : '', message: current?.message ?? '' } }));
    setEditingId(request.id);
  };

  const saveOffer = async (request: RequestItem) => {
    const values = form[request.id] ?? { price: '', days: '', message: '' };
    try {
      await api.updateCustomerRequestResponse(request.id, { price: values.price ? Number(values.price) : undefined, days: values.days ? Number(values.days) : undefined, message: values.message.trim() || undefined });
      setNotice('Votre offre a été mise à jour et le client a été prévenu.');
      setEditingId(null);
      await mutate();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Impossible de modifier l’offre.');
    }
  };

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
      <header><p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p><h1 className="mt-1 text-3xl font-semibold text-stone-900">{t('opportunities_title')}</h1><p className="mt-2 text-stone-600">{t('opportunities_subtitle')}</p></header>
      {notice ? <p className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-900">{notice}</p> : null}
      <div className="grid gap-3 sm:grid-cols-2"><input value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} placeholder={t('opportunities_filter_trade')} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /><input value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} placeholder={t('opportunities_filter_city')} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /></div>
      {!requests?.length ? <p className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-600">{t('opportunities_empty')}</p> : <div className="space-y-8">{sections.map((section) => { const cards = section.items.map((request) => { const values = form[request.id] ?? { price: '', days: '', message: '' }; const pending = isPending(request); return <article key={request.id} className={`space-y-4 rounded-lg border bg-white p-6 ${pending ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-100' : 'border-stone-200'}`}><div className="flex flex-wrap justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2">{pending ? <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase text-white">À traiter</span> : null}<p className="text-xs font-medium uppercase tracking-wide text-amber-700">{request.category}</p>{request.targeted ? <span className="rounded-full bg-amber-700 px-2 py-0.5 text-xs font-medium text-white">Demande qui vous est adressée</span> : null}{typeof request.matchScore === 'number' && request.matchScore > 0 ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Correspondance {request.matchScore}%</span> : null}{request.alreadyAnswered ? <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">Déjà répondu</span> : null}</div><h2 className="mt-1 text-xl font-semibold text-stone-900">Projet à {request.city}</h2><p className={`text-sm ${pending ? 'font-semibold text-red-800' : 'text-stone-500'}`}>Reçue le {formatDateTime(request.createdAt)} · {elapsed(request.createdAt)}</p>{request.neighborhood ? <p className="text-sm text-stone-500">{request.neighborhood}</p> : null}</div>{request.budgetMax ? <p className="text-sm text-stone-600">Budget : {request.budgetMin ?? 0} - {request.budgetMax} FCFA</p> : null}</div><p className="whitespace-pre-wrap text-stone-700">{request.description}</p>{request.requestedDate ? <p className="text-sm text-stone-600">Souhaité pour le {new Date(request.requestedDate).toLocaleDateString('fr-FR')}</p> : null}{request.fileUrls?.length ? <div className="flex flex-wrap gap-2">{request.fileUrls.map((fileUrl) => <a key={fileUrl} href={fileUrl} target="_blank" rel="noreferrer" className="block"><img src={fileUrl} alt="Photo du besoin" className="h-24 w-24 rounded-md border border-stone-200 object-cover" /></a>)}</div> : null}{request.awarded && !request.awardedToMe ? <p className="rounded-md border border-stone-300 bg-stone-100 px-4 py-3 text-sm font-medium text-stone-700">Offre déjà pourvue : le client a retenu un autre artisan.</p> : request.myResponse && editingId !== request.id ? <div className={`space-y-2 rounded-md border px-4 py-3 text-sm ${request.awardedToMe ? 'border-green-300 bg-green-50' : 'border-stone-200 bg-stone-50'}`}>{request.awardedToMe ? <p className="font-semibold text-green-800">Le client a retenu votre offre. Après discussion, vous pouvez fixer le prix convenu.</p> : null}<p className="text-stone-800">Votre offre : <strong>{request.myResponse.price !== undefined && request.myResponse.price !== null ? `${request.myResponse.price} FCFA` : 'prix à convenir'}</strong>{request.myResponse.days ? ` · ${request.myResponse.days} jours` : ''}{request.myResponse.status === 'rejected' ? ' · refusée par le client' : ''}</p><p className="text-stone-600">{request.myResponse.message}</p>{request.myResponse.updatedAt ? <p className="text-xs text-stone-500">Modifiée le {new Date(request.myResponse.updatedAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p> : null}<button type="button" onClick={() => startEditing(request)} className="rounded-md border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-800 hover:bg-amber-50">{request.awardedToMe ? 'Fixer le prix convenu' : 'Modifier mon offre'}</button></div> : <><div className="grid gap-3 sm:grid-cols-3"><input type="number" min="1" placeholder="Prix proposé (FCFA)" value={values.price} onChange={(event) => setForm((current) => ({ ...current, [request.id]: { ...values, price: event.target.value } }))} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /><input type="number" min="1" placeholder="Délai (jours)" value={values.days} onChange={(event) => setForm((current) => ({ ...current, [request.id]: { ...values, days: event.target.value } }))} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /><input placeholder="Votre message" value={values.message} onChange={(event) => setForm((current) => ({ ...current, [request.id]: { ...values, message: event.target.value } }))} className="rounded-md border border-stone-300 px-3 py-2 text-sm" /></div>{editingId === request.id ? <div className="flex flex-wrap gap-2"><button onClick={() => void saveOffer(request)} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">Enregistrer la nouvelle offre</button><button type="button" onClick={() => setEditingId(null)} className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700">Annuler</button></div> : <button onClick={() => void respond(request)} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">Répondre au client</button>}</>}</article>; }); return section.collapsed ? <details key={section.key} className="rounded-lg border border-stone-200 bg-stone-50 p-4"><summary className="cursor-pointer text-sm font-semibold text-stone-700">{section.title} ({section.items.length})</summary><div className="mt-4 space-y-5">{cards}</div></details> : <section key={section.key}><h2 className={`text-lg font-semibold ${section.key === 'pending' ? 'text-red-800' : 'text-stone-900'}`}>{section.title}</h2>{section.hint ? <p className="mt-1 text-sm text-stone-600">{section.hint}</p> : null}<div className="mt-3 space-y-5">{cards}</div></section>; })}</div>}
    </div>
  );
}
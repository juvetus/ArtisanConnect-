'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ServiceOrder } from '@/lib/types';

export default function AdminServiceOrdersPage() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    try {
      setOrders((await api.getPendingServiceOrders()) as ServiceOrder[]);
    } catch {
      setNotice('Impossible de charger les demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === 'admin') void loadOrders();
  }, [ready, user]);

  const act = async (id: string, action: 'validate' | 'request' | 'reject') => {
    try {
      if (action === 'validate') await api.validateServiceOrder(id);
      if (action === 'request') await api.requestServiceOrderDetails(id, feedback[id] || 'Merci de préciser votre besoin.');
      if (action === 'reject') await api.rejectServiceOrder(id, feedback[id] || 'La demande ne peut pas être traitée.');
      setNotice('Demande mise à jour.');
      await loadOrders();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action impossible.');
    }
  };

  if (!ready || user?.role !== 'admin') return null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Administration</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">Demandes de service</h1>
        <p className="mt-2 text-stone-600">Vérifiez les demandes avant leur transmission à l’artisan.</p>
      </header>
      {notice ? <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p> : null}
      {loading ? <p className="text-stone-600">Chargement...</p> : null}
      {!loading && !orders.length ? <p className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-600">Aucune demande en attente.</p> : null}
      <div className="space-y-5">
        {orders.map((order) => (
          <article key={order.id} className="rounded-lg border border-stone-200 bg-white p-6">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{order.service?.category}</p>
                <h2 className="mt-1 text-xl font-semibold text-stone-900">{order.service?.title}</h2>
                <p className="mt-1 text-sm text-stone-600">Client : {order.client?.name} · Artisan : {order.artisan?.name}</p>
              </div>
              <p className="text-sm text-stone-500">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm text-stone-700">{order.projectObjective}</p>
            <p className="mt-4 text-sm text-stone-600">Budget : {order.budgetMin || 'non précisé'} - {order.budgetMax || 'non précisé'} FCFA</p>

            {order.fileUrls && order.fileUrls.length > 0 && (
              <div className="mt-4 rounded-md border border-stone-200 bg-stone-50 p-3">
                <p className="text-xs font-semibold uppercase text-stone-700 mb-2">Pièces jointes client ({order.fileUrls.length}) :</p>
                <div className="flex flex-wrap gap-2">
                  {order.fileUrls.map((url, i) => {
                    const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${url}`;
                    return (
                      <a
                        key={i}
                        href={fullUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded border border-stone-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-stone-50 shadow-xs"
                      >
                        📄 Document {i + 1} ↗
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            <textarea value={feedback[order.id] || ''} onChange={(event) => setFeedback({ ...feedback, [order.id]: event.target.value })} placeholder="Feedback ou précisions demandées" rows={3} className="mt-5 block w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
            <div className="mt-4 flex flex-wrap gap-3">
              <button onClick={() => void act(order.id, 'validate')} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Valider et transmettre</button>
              <button onClick={() => void act(order.id, 'request')} className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700">Demander précision</button>
              <button onClick={() => void act(order.id, 'reject')} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Refuser</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

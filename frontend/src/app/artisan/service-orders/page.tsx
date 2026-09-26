'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { ServiceOrder } from '@/lib/types';

export default function ArtisanServiceOrdersPage() {
  const { user, ready } = useAuth();
  const { t, language } = useLanguage();
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [deliveryLinks, setDeliveryLinks] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const statusLabels: Record<ServiceOrder['status'], string> = {
    pending_admin_validation: language === 'en' ? 'Admin Validation' : 'Validation admin',
    details_requested: language === 'en' ? 'Details Requested' : 'Précisions demandées',
    sent_to_artisan: language === 'en' ? 'To Process' : 'À traiter',
    quote_pending: language === 'en' ? 'Pending Quote' : 'Devis en attente',
    accepted: language === 'en' ? 'Accepted' : 'Acceptée',
    in_progress: language === 'en' ? 'In Progress' : 'En cours',
    delivered: language === 'en' ? 'Delivered' : 'Livrée',
    completed: language === 'en' ? 'Completed' : 'Terminée',
    disputed: language === 'en' ? 'Disputed' : 'Litige',
    cancelled: language === 'en' ? 'Cancelled' : 'Annulée',
    rejected: language === 'en' ? 'Rejected' : 'Refusée',
  };

  const loadOrders = async () => {
    try {
      setOrders((await api.getArtisanServiceOrders()) as ServiceOrder[]);
    } catch {
      setNotice('Impossible de charger vos demandes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ready && user?.role === 'artisan') void loadOrders();
  }, [ready, user]);

  const run = async (action: () => Promise<unknown>) => {
    try {
      setNotice('');
      await action();
      setNotice('Commande mise à jour.');
      await loadOrders();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Action impossible.');
    }
  };

  if (!ready || user?.role !== 'artisan') return null;

  const isFinished = (order: ServiceOrder) => ['completed', 'cancelled', 'rejected'].includes(order.status);
  const activeOrders = orders.filter((order) => !isFinished(order));
  const finishedOrders = orders.filter(isFinished);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700">{t('artisan_orders_badge')}</p>
        <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t('artisan_orders_title')}</h1>
        <p className="mt-2 text-stone-600">{t('artisan_orders_subtitle')}</p>
      </header>
      {notice ? <p className="rounded-md bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p> : null}
      {loading ? <p className="text-stone-600">{t('action_loading')}</p> : null}
      {!loading && !orders.length ? <p className="rounded-lg border border-stone-200 bg-stone-50 p-6 text-stone-600">{t('artisan_orders_empty')}</p> : null}
      {[{ key: 'active', items: activeOrders }, { key: 'finished', items: finishedOrders }].map(({ key, items }) => {
        if (!items.length) return null;
        const list = (
      <div className="space-y-5">
        {items.map((order) => (
          <article key={order.id} className="rounded-lg border border-stone-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-700">{order.service?.category}</p>
                <h2 className="mt-1 text-xl font-semibold text-stone-900">{order.service?.title}</h2>
                <p className="mt-1 text-sm text-stone-600">{t('artisan_orders_client')} {order.client?.name}</p>
              </div>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">{statusLabels[order.status]}</span>
            </div>
            <p className="mt-5 whitespace-pre-wrap text-sm text-stone-700">{order.projectObjective}</p>
            <Link href={`/service-orders/${order.id}`} className="mt-4 inline-block text-sm font-medium text-amber-700 hover:text-amber-800">{t('artisan_orders_see_quote')}</Link>

            {order.status === 'sent_to_artisan' ? (
              <div className="mt-5 space-y-3 border-t border-stone-200 pt-5">
                <textarea value={feedback[order.id] || ''} onChange={(event) => setFeedback({ ...feedback, [order.id]: event.target.value })} rows={2} placeholder="Raison obligatoire en cas de refus" className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" />
                <div className="flex flex-wrap gap-3"><button onClick={() => void run(() => api.artisanRespondToServiceOrder(order.id, true))} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Accepter la demande</button><button onClick={() => void run(() => api.artisanRespondToServiceOrder(order.id, false, feedback[order.id]))} className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Refuser la demande</button></div>
              </div>
            ) : null}

            {order.status === 'accepted' ? <button onClick={() => void run(() => api.startServiceOrder(order.id))} className="mt-5 rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">Démarrer la commande</button> : null}

            {order.status === 'in_progress' ? (
              <div className="mt-5 space-y-3 border-t border-stone-200 pt-5"><label className="block text-sm font-medium text-stone-700">Lien vers les livrables *</label><input value={deliveryLinks[order.id] || ''} onChange={(event) => setDeliveryLinks({ ...deliveryLinks, [order.id]: event.target.value })} placeholder="https://..." className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm" /><button disabled={!deliveryLinks[order.id]?.trim()} onClick={() => void run(() => api.deliverServiceOrder(order.id, [deliveryLinks[order.id]]))} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-stone-400">Livrer le travail</button></div>
            ) : null}
          </article>
        ))}
      </div>
        );
        return key === 'active' ? <div key={key}>{list}</div> : (
          <details key={key} className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <summary className="cursor-pointer text-sm font-semibold text-stone-700">{language === 'en' ? 'Completed, cancelled or rejected requests' : 'Demandes terminées, annulées ou refusées'} ({items.length})</summary>
            <div className="mt-4">{list}</div>
          </details>
        );
      })}
    </div>
  );
}

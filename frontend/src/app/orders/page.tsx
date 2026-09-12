'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { ReviewSection } from '@/components/ReviewSection';
import type { Order } from '@/lib/types';

/** Journal du workflow escrow côté acheteur. */
function EscrowSteps({ order }: { order: Order }) {
  if (order.paymentMethod !== 'orange_money') return null;
  const steps = [
    { label: 'Paiement bloqué (escrow)', done: Boolean(order.payment && order.payment.status !== 'pending') },
    { label: 'Vendeur : produit disponible', done: order.sellerConfirmedAvailability },
    { label: 'Transporteur : produit récupéré et conforme', done: order.carrierVerified },
    { label: 'Réception confirmée', done: order.buyerConfirmedReception },
    { label: 'Paiement libéré au vendeur', done: order.payment?.status === 'captured' },
  ];
  return (
    <ol className="mt-2 space-y-1 text-sm">
      {steps.map((s) => (
        <li key={s.label} className={s.done ? 'text-green-700' : 'text-stone-500'}>
          {s.done ? '✓' : '○'} {s.label}
        </li>
      ))}
      {order.cancellationReason && (
        <li className="text-red-600">✗ {order.cancellationReason} — remboursement effectué</li>
      )}
    </ol>
  );
}

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const { data, isLoading, mutate } = useSWR(user ? ['buyer-orders', user.id] : null, ([, id]) =>
    api.buyerOrders(id),
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  if (!ready || !user || isLoading) return <p className="text-stone-600">{t('action_loading')}</p>;

  const [orders] = data ?? [[]];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t('orders_page_title')}</h1>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
          <p className="text-stone-600">{t('orders_page_empty')}</p>
          <Link href="/" className="mt-2 inline-block text-amber-700 underline">
            {t('orders_page_browse')}
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4"
            >
              <div>
                <p className="font-medium">{order.listing?.title ?? 'Annonce supprimée'}</p>
                <p className="text-sm text-stone-600">
                  {order.quantity} × · Vendu par {order.seller?.name ?? '—'} ·{' '}
                  {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {order.paymentMethod === 'orange_money'
                    ? 'Paiement Orange Money'
                    : 'Règlement en espèces à la remise'}
                  {order.payment && (
                    <>
                      {' — '}
                      <StatusBadge status={order.payment.status} />
                    </>
                  )}
                </p>

                {order.seller && (
                  <Link
                    href={`/messages?to=${order.sellerId}`}
                    className="mt-2 inline-block text-sm text-amber-700 underline"
                  >
                    Contacter l&apos;artisan
                  </Link>
                )}

                {order.status === 'completed' && <ReviewSection orderId={order.id} />}

                <EscrowSteps order={order} />

                {order.paymentMethod === 'orange_money' && order.status !== 'cancelled' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.payment?.status === 'pending' && order.status === 'pending' && (
                      <button
                        onClick={() => run(order.id, () => api.startWebpayment(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
                      >
                        Payer avec Orange Money (bloqué)
                      </button>
                    )}
                    {order.carrierVerified && !order.buyerConfirmedReception && (
                      <button
                        onClick={() => run(order.id, () => api.confirmReception(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        Confirmer la réception
                      </button>
                    )}
                    {order.buyerConfirmedReception && order.payment?.status !== 'captured' && (
                      <button
                        onClick={() => run(order.id, () => api.disburse(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        Libérer le paiement
                      </button>
                    )}
                    {order.status === 'pending' && order.payment?.status === 'pending' && (
                      <button
                        onClick={() => run(order.id, () => api.refundOrder(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        Annuler et être remboursé
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">{formatXAF(order.totalPrice)}</span>
                <StatusBadge status={order.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { ReviewSection } from '@/components/ReviewSection';

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const { data, isLoading } = useSWR(user ? ['buyer-orders', user.id] : null, ([, id]) =>
    api.buyerOrders(id),
  );

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  if (!ready || !user || isLoading) return <p className="text-stone-600">Chargement…</p>;

  const [orders] = data ?? [[]];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Mes commandes</h1>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
          <p className="text-stone-600">Vous n&apos;avez pas encore passé de commande.</p>
          <Link href="/" className="mt-2 inline-block text-amber-700 underline">
            Parcourir le catalogue
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

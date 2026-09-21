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

function whatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('237')) return digits;
  if (digits.startsWith('0')) return `237${digits.slice(1)}`;
  return digits;
}

function sellerWhatsappHref(order: Order) {
  const phone = (order.seller?.whatsappPhone ?? order.seller?.phone)?.trim();
  if (!phone) return null;
  const number = whatsappNumber(phone);
  if (number.length < 9) return null;
  const item = order.listing?.title ?? 'ma commande';
  const message = encodeURIComponent(
    `Bonjour ${order.seller?.name ?? ''}, je vous contacte au sujet de ma commande ${order.id.slice(0, 8)} pour « ${item} » sur ArtisanConnect.`,
  );
  return `https://wa.me/${number}?text=${message}`;
}

/** Journal du workflow escrow côté acheteur. */
function EscrowSteps({ order }: { order: Order }) {
  if (order.paymentMethod !== 'orange_money' && order.paymentMethod !== 'momo') return null;
  const steps = [
    { label: 'Paiement bloqué (escrow)', done: Boolean(order.payment && order.payment.status !== 'pending') },
    { label: 'Vendeur : produit disponible', done: order.sellerConfirmedAvailability },
    ...(order.deliveryMethod === 'carrier' ? [{ label: 'Transporteur : produit récupéré et conforme', done: order.carrierVerified }] : []),
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
  const [momoPhones, setMomoPhones] = useState<Record<string, string>>({});
  const [momoError, setMomoError] = useState<Record<string, string>>({});

  const run = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    try {
      await action();
      await mutate();
    } finally {
      setBusyId(null);
    }
  };

  const payWithMomo = async (order: Order) => {
    const payerPhone = (momoPhones[order.id] || user?.phone || '').trim();
    if (!payerPhone) {
      setMomoError((current) => ({ ...current, [order.id]: 'Veuillez saisir votre numéro MoMo.' }));
      return;
    }

    setBusyId(order.id);
    setMomoError((current) => ({ ...current, [order.id]: '' }));
    try {
      const payment = await api.initiateMomoPayment(order.id, payerPhone);
      if (payment.redirectUrl) {
        window.location.assign(payment.redirectUrl);
        return;
      }

      const referenceId = payment.paymentReference || payment.orangeMoneyTransactionId;
      if (referenceId) {
        router.push(`/payment/callback?type=payment&referenceId=${encodeURIComponent(referenceId)}`);
        return;
      }

      await mutate();
    } catch (error) {
      setMomoError((current) => ({
        ...current,
        [order.id]: error instanceof Error ? error.message : 'Impossible de lancer le paiement MoMo.',
      }));
    } finally {
      setBusyId(null);
    }
  };

  const payWithOrangeMoney = async (order: Order) => {
    setBusyId(order.id);
    try {
      const payment = await api.startWebpayment(order.id);
      window.location.assign(payment.paymentUrl);
    } finally {
      setBusyId(null);
    }
  };

  const startCarrierDelivery = async (order: Order) => {
    await run(order.id, () => api.createDeliveryRide(order.id));
  };

  const refreshCarrierDelivery = async (order: Order) => {
    await run(order.id, () => api.getDeliveryStatus(order.id));
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
                  {order.paymentMethod === 'momo'
                    ? 'Paiement MoMo'
                    : order.paymentMethod === 'orange_money'
                      ? 'Paiement Orange Money'
                      : 'Règlement en espèces à la remise'}
                  {order.payment && (
                    <>
                      {' — '}
                      <StatusBadge status={order.payment.status} />
                    </>
                  )}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  Livraison : {order.deliveryMethod === 'home'
                    ? `À domicile${order.deliveryAddress ? ` - ${order.deliveryAddress}` : ''}`
                    : order.deliveryMethod === 'carrier'
                      ? `Transporteur${order.deliveryAddress ? ` - ${order.deliveryAddress}` : ''}`
                      : "Retrait à l'atelier"}
                </p>
                {order.deliveryMethod === 'carrier' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                    {order.deliveryTrackingId ? (
                      <>
                        <span>Suivi {order.deliveryCarrier || 'Gozem'} : {order.deliveryStatus}</span>
                        {order.deliveryTrackingUrl && (
                          <a href={order.deliveryTrackingUrl} target="_blank" rel="noreferrer" className="text-amber-700 underline">
                            Ouvrir le suivi
                          </a>
                        )}
                        <button
                          onClick={() => void refreshCarrierDelivery(order)}
                          disabled={busyId === order.id}
                          className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                        >
                          Actualiser
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => void startCarrierDelivery(order)}
                        disabled={busyId === order.id}
                        className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-60"
                      >
                        Demander un transporteur
                      </button>
                    )}
                  </div>
                )}

                {order.seller && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <Link
                      href={`/messages?to=${order.sellerId}`}
                      className="text-sm text-amber-700 underline"
                    >
                      Contacter l&apos;artisan par message
                    </Link>
                    {sellerWhatsappHref(order) ? (
                      <a
                        href={sellerWhatsappHref(order) ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                  </div>
                )}

                {order.status === 'completed' && <ReviewSection orderId={order.id} />}

                <EscrowSteps order={order} />

                {(order.paymentMethod === 'momo' || order.paymentMethod === 'orange_money') && order.status !== 'cancelled' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.paymentMethod === 'momo' && order.payment?.status === 'pending' && order.status === 'pending' && (
                      <div className="flex w-full flex-wrap items-start gap-2">
                        <div>
                          <label htmlFor={`momo-${order.id}`} className="sr-only">Numéro MoMo</label>
                          <input
                            id={`momo-${order.id}`}
                            type="tel"
                            value={momoPhones[order.id] ?? user.phone ?? ''}
                            onChange={(event) => setMomoPhones((current) => ({ ...current, [order.id]: event.target.value }))}
                            placeholder="237699000000"
                            className="w-44 rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                          />
                          {momoError[order.id] && <p className="mt-1 text-xs text-red-600">{momoError[order.id]}</p>}
                        </div>
                        <button
                          onClick={() => void payWithMomo(order)}
                          disabled={busyId === order.id}
                          className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
                        >
                          Payer avec MoMo
                        </button>
                      </div>
                    )}
                    {order.paymentMethod === 'orange_money' && order.payment?.status === 'pending' && order.status === 'pending' && (
                      <button
                        onClick={() => void payWithOrangeMoney(order)}
                        disabled={busyId === order.id}
                        className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-60"
                      >
                        Payer avec Orange Money
                      </button>
                    )}
                    {(order.deliveryMethod === 'workshop' ? order.sellerConfirmedAvailability : order.carrierVerified) && !order.buyerConfirmedReception && (
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

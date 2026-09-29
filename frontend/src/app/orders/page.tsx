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
import { CARRIER_ENABLED, CARRIER_SIMULATION_MODE, MOBILE_MONEY_ENABLED, MOBILE_MONEY_TEST_MODE } from '@/lib/pilot-capabilities';

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
function EscrowSteps({ order, english }: { order: Order; english: boolean }) {
  if (order.paymentMethod !== 'orange_money' && order.paymentMethod !== 'momo') return null;
  const steps = [
    { label: MOBILE_MONEY_TEST_MODE ? (english ? 'Test payment status recorded' : 'Statut du paiement test enregistré') : (english ? 'Payment held in escrow' : 'Paiement bloqué en escrow'), done: Boolean(order.payment && order.payment.status !== 'pending') },
    { label: english ? 'Seller confirmed product availability' : 'Vendeur : produit disponible', done: order.sellerConfirmedAvailability },
    ...(order.deliveryMethod === 'carrier' ? [{ label: CARRIER_SIMULATION_MODE ? (english ? 'Simulated carrier step' : 'Étape transporteur simulée') : (english ? 'Carrier collected and verified the product' : 'Transporteur : produit récupéré et conforme'), done: order.carrierVerified }] : []),
    { label: english ? 'Receipt confirmed' : 'Réception confirmée', done: order.buyerConfirmedReception },
    { label: MOBILE_MONEY_TEST_MODE ? (english ? 'Test settlement status recorded' : 'Statut de règlement test enregistré') : (english ? 'Payment released to seller' : 'Paiement libéré au vendeur'), done: order.payment?.status === 'captured' },
  ];
  return (
    <ol className="mt-2 space-y-1 text-sm">
      {steps.map((s) => (
        <li key={s.label} className={s.done ? 'text-green-700' : 'text-stone-500'}>
          {s.done ? '✓' : '○'} {s.label}
        </li>
      ))}
      {order.cancellationReason && (
        <li className="text-red-600">✗ {order.cancellationReason} — {MOBILE_MONEY_TEST_MODE ? (english ? 'test refund status recorded' : 'statut de remboursement test enregistré') : (english ? 'refund issued' : 'remboursement effectué')}</li>
      )}
    </ol>
  );
}

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const { t, language } = useLanguage();
  const english = language === 'en';
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
      setMomoError((current) => ({ ...current, [order.id]: t('orders_momo_phone_error') }));
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
        [order.id]: error instanceof Error ? error.message : t('orders_momo_start_error'),
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
  const isFinishedOrder = (order: Order) => order.status === 'completed' || order.status === 'cancelled';

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
            <li key={order.id} className="list-none">
              <details open={!isFinishedOrder(order)} className="rounded-lg border border-stone-200 bg-white">
                <summary className={`flex flex-wrap items-center justify-between gap-4 p-4 ${isFinishedOrder(order) ? 'cursor-pointer' : 'list-none [&::-webkit-details-marker]:hidden'}`}>
                  <span className="min-w-0">
                    <span className="block font-medium">{order.listing?.title ?? t('orders_listing_removed')}</span>
                    <span className="mt-1 block text-sm text-stone-600">{order.quantity} × · {t('orders_sold_by')} {order.seller?.name ?? '—'} · {new Date(order.createdAt).toLocaleDateString(english ? 'en-US' : 'fr-FR')}</span>
                  </span>
                  <span className="flex items-center gap-4"><span className="text-lg font-semibold">{formatXAF(order.totalPrice)}</span><StatusBadge status={order.status} /></span>
                </summary>
                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 p-4">
              <div>
                <p className="font-medium">{order.listing?.title ?? t('orders_listing_removed')}</p>
                <p className="text-sm text-stone-600">
                  {order.quantity} × · {t('orders_sold_by')} {order.seller?.name ?? '—'} ·{' '}
                  {new Date(order.createdAt).toLocaleDateString(english ? 'en-US' : 'fr-FR')}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {order.paymentMethod === 'momo'
                    ? (MOBILE_MONEY_TEST_MODE ? 'MoMo — test' : 'MoMo')
                    : order.paymentMethod === 'orange_money'
                      ? (MOBILE_MONEY_TEST_MODE ? 'Orange Money — test' : 'Orange Money')
                      : t('orders_cash_handover')}
                  {order.payment && (
                    <>
                      {' — '}
                      <StatusBadge status={order.payment.status} />
                    </>
                  )}
                </p>
                {order.status === 'completed' && order.payment && ['confirmed', 'captured'].includes(order.payment.status) ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => api.downloadInvoice(order.id).catch((error) => setMomoError((current) => ({ ...current, [order.id]: error instanceof Error ? error.message : 'Facture indisponible.' })))}
                      className="rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
                    >
                      Télécharger la facture
                    </button>
                    {momoError[order.id] ? <p className="mt-1 text-xs text-red-600">{momoError[order.id]}</p> : null}
                  </div>
                ) : null}
                <p className="mt-1 text-sm text-stone-500">
                  {t('orders_delivery')} : {order.deliveryMethod === 'home'
                    ? `${t('orders_home_delivery')}${order.deliveryAddress ? ` - ${order.deliveryAddress}` : ''}`
                    : order.deliveryMethod === 'carrier'
                      ? `${t('orders_carrier')}${order.deliveryAddress ? ` - ${order.deliveryAddress}` : ''}`
                      : t('orders_workshop_pickup')}
                </p>
                {order.deliveryMethod === 'carrier' && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-stone-600">
                    {!CARRIER_ENABLED ? <p role="note" className="w-full rounded-md border border-stone-200 bg-stone-100 p-2 text-xs text-stone-600">{t('carrier_coming_soon')}</p> : CARRIER_SIMULATION_MODE ? <p role="note" className="w-full rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{t('carrier_simulation_notice')}</p> : null}
                    {order.deliveryTrackingId ? (
                      <>
                        <span>{t('orders_tracking')} {CARRIER_SIMULATION_MODE ? (english ? 'Simulation' : 'Simulation') : (order.deliveryCarrier || 'Gozem')} : {order.deliveryStatus}</span>
                        {order.deliveryTrackingUrl && (
                          <a href={order.deliveryTrackingUrl} target="_blank" rel="noreferrer" className="text-amber-700 underline">
                            {t('orders_open_tracking')}
                          </a>
                        )}
                        <button
                          onClick={() => void refreshCarrierDelivery(order)}
                          disabled={!CARRIER_ENABLED || busyId === order.id}
                          className="rounded-md border border-stone-200 px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-60"
                        >
                          {t('orders_refresh')}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => void startCarrierDelivery(order)}
                        disabled={!CARRIER_ENABLED || busyId === order.id}
                        className="rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {CARRIER_SIMULATION_MODE ? (english ? 'Simulate carrier request' : 'Simuler la demande transporteur') : t('orders_request_carrier')}
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
                      {t('orders_message_artisan')}
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

                <EscrowSteps order={order} english={english} />

                {(order.paymentMethod === 'momo' || order.paymentMethod === 'orange_money') && order.status !== 'cancelled' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {!MOBILE_MONEY_ENABLED ? <p role="note" className="w-full rounded-md border border-stone-200 bg-stone-100 p-2 text-xs text-stone-600">{t('mobile_money_coming_soon')}</p> : MOBILE_MONEY_TEST_MODE ? <p role="note" className="w-full rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">{t('payment_test_mode_notice')}</p> : null}
                    {order.paymentMethod === 'momo' && order.payment?.status === 'pending' && order.status === 'pending' && (
                      <div className="flex w-full flex-wrap items-start gap-2">
                        <div>
                          <label htmlFor={`momo-${order.id}`} className="sr-only">{t('orders_momo_number')}</label>
                          <input
                            id={`momo-${order.id}`}
                            type="tel"
                            value={momoPhones[order.id] ?? user.phone ?? ''}
                            onChange={(event) => setMomoPhones((current) => ({ ...current, [order.id]: event.target.value }))}
                            disabled={!MOBILE_MONEY_ENABLED}
                            placeholder="237699000000"
                            className="w-44 rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
                          />
                          {momoError[order.id] && <p className="mt-1 text-xs text-red-600">{momoError[order.id]}</p>}
                        </div>
                        <button
                          onClick={() => void payWithMomo(order)}
                          disabled={!MOBILE_MONEY_ENABLED || busyId === order.id}
                          className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {MOBILE_MONEY_TEST_MODE ? (english ? 'Run MoMo test' : 'Lancer le test MoMo') : t('orders_pay_momo')}
                        </button>
                      </div>
                    )}
                    {order.paymentMethod === 'orange_money' && order.payment?.status === 'pending' && order.status === 'pending' && (
                      <button
                        onClick={() => void payWithOrangeMoney(order)}
                        disabled={!MOBILE_MONEY_ENABLED || busyId === order.id}
                        className="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {MOBILE_MONEY_TEST_MODE ? (english ? 'Run Orange Money test' : 'Lancer le test Orange Money') : t('orders_pay_orange')}
                      </button>
                    )}
                    {(order.deliveryMethod === 'carrier' ? order.carrierVerified : order.sellerConfirmedAvailability) && !order.buyerConfirmedReception && (
                      <button
                        onClick={() => run(order.id, () => api.confirmReception(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        {t('orders_confirm_receipt')}
                      </button>
                    )}
                    {order.buyerConfirmedReception && order.payment?.status !== 'captured' && (
                      <button
                        onClick={() => run(order.id, () => api.disburse(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                      >
                        {t('orders_release_payment')}
                      </button>
                    )}
                    {order.status === 'pending' && order.payment?.status === 'pending' && (
                      <button
                        onClick={() => run(order.id, () => api.refundOrder(order.id))}
                        disabled={busyId === order.id}
                        className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {t('orders_cancel_refund')}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">{formatXAF(order.totalPrice)}</span>
                <StatusBadge status={order.status} />
              </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

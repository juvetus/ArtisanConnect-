'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { MOBILE_MONEY_TEST_MODE } from '@/lib/pilot-capabilities';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const type = searchParams.get('type') || 'payment';
  const referenceId = searchParams.get('referenceId') || searchParams.get('externalId') || '';
  const externalId = searchParams.get('externalId') || '';
  const orderId = searchParams.get('orderId') || (externalId.startsWith('ORDER-') ? externalId.slice('ORDER-'.length) : '');
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>(() => referenceId ? 'loading' : 'failed');
  const [message, setMessage] = useState(() => referenceId ? 'Vérification du paiement en cours...' : 'Référence de paiement absente.');

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!referenceId) return;

    const verifyPayment = async () => {
      try {
        if (type === 'subscription') {
          const subscription = await api.confirmSubscriptionPayment(referenceId);
          setStatus(subscription.status === 'active' ? 'success' : subscription.status === 'failed' ? 'failed' : 'pending');
          setMessage(subscription.status === 'active'
            ? MOBILE_MONEY_TEST_MODE ? 'Validation de test réussie. Aucun paiement réel n’a été encaissé.' : 'Votre abonnement est actif.'
            : subscription.status === 'failed'
              ? 'Le paiement de votre abonnement a échoué.'
              : 'Votre paiement est encore en attente de confirmation MoMo.');
          return;
        }

        const result = await api.getMomoPaymentCallback(referenceId);
        if (result.status === 'SUCCESS' && orderId) {
          const payment = await api.confirmMomoPayment(orderId);
          if (payment.status === 'confirmed' || payment.status === 'captured') {
            setStatus('success');
            setMessage(MOBILE_MONEY_TEST_MODE ? 'Parcours MoMo de test confirmé; aucune somme réelle n’a été encaissée.' : 'Paiement MoMo confirmé et commande mise à jour.');
            return;
          }
        }
        setStatus(result.status === 'SUCCESS' ? 'success' : result.status === 'FAILED' || result.status === 'EXPIRED' ? 'failed' : 'pending');
        setMessage(result.status === 'SUCCESS'
          ? MOBILE_MONEY_TEST_MODE ? 'Résultat de test MoMo confirmé; aucun paiement réel n’a été encaissé.' : 'Paiement confirmé par MoMo.'
          : result.status === 'FAILED' || result.status === 'EXPIRED'
            ? 'Le paiement MoMo a échoué ou expiré.'
            : 'Paiement en attente de confirmation MoMo.');
      } catch (error) {
        setStatus('failed');
        setMessage(error instanceof Error ? error.message : 'Impossible de vérifier le paiement MoMo.');
      }
    };

    void verifyPayment();
  }, [externalId, orderId, ready, referenceId, router, type, user]);

  const badgeClass = status === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'failed'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Retour MoMo</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">{MOBILE_MONEY_TEST_MODE ? 'Résultat du parcours de paiement test' : 'Confirmation du paiement'}</h1>
        <div className={`mt-6 rounded-md border px-4 py-3 text-sm ${badgeClass}`}>
          {message}
        </div>
        {referenceId && (
          <p className="mt-4 text-sm text-stone-500">Référence: {referenceId}</p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
            Retour au dashboard
          </Link>
          <Link href="/payment?type=subscription" className="rounded-md border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">
            Réessayer
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-600">Chargement...</div>}>
      <PaymentCallbackContent />
    </Suspense>
  );
}

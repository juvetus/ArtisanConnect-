'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function PaymentCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, ready } = useAuth();
  const type = searchParams.get('type') || 'payment';
  const referenceId = searchParams.get('referenceId') || searchParams.get('externalId') || '';
  const [status, setStatus] = useState<'loading' | 'success' | 'pending' | 'failed'>('loading');
  const [message, setMessage] = useState('Vérification du paiement en cours...');

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!referenceId) {
      setStatus('failed');
      setMessage('Référence de paiement absente.');
      return;
    }

    const verifyPayment = async () => {
      try {
        if (type === 'subscription') {
          const subscription = await api.confirmSubscriptionPayment(referenceId);
          setStatus(subscription.status === 'active' ? 'success' : subscription.status === 'failed' ? 'failed' : 'pending');
          setMessage(subscription.status === 'active'
            ? 'Votre abonnement est actif.'
            : subscription.status === 'failed'
              ? 'Le paiement de votre abonnement a échoué.'
              : 'Votre paiement est encore en attente de confirmation MoMo.');
          return;
        }

        const result = await api.getMomoPaymentCallback(referenceId);
        setStatus(result.status === 'SUCCESS' ? 'success' : result.status === 'FAILED' || result.status === 'EXPIRED' ? 'failed' : 'pending');
        setMessage(result.status === 'SUCCESS'
          ? 'Paiement confirmé par MoMo.'
          : result.status === 'FAILED' || result.status === 'EXPIRED'
            ? 'Le paiement MoMo a échoué ou expiré.'
            : 'Paiement en attente de confirmation MoMo.');
      } catch (error) {
        setStatus('failed');
        setMessage(error instanceof Error ? error.message : 'Impossible de vérifier le paiement MoMo.');
      }
    };

    void verifyPayment();
  }, [ready, referenceId, router, type, user]);

  const badgeClass = status === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : status === 'failed'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Retour MoMo</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">Confirmation du paiement</h1>
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

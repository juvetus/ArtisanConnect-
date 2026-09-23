'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-stone-600">Chargement...</div>}>
      <PaymentPageContent />
    </Suspense>
  );
}

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'subscription';
  const requestedPlan = searchParams.get('plan');
  const { user, ready } = useAuth();
  const [plans, setPlans] = useState<Array<{ id: string; name: string; price: number; currency: string; durationDays: number; description?: string | null }>>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState('');
  const [promotionCode, setPromotionCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!ready || !user) {
      router.push('/login');
      return;
    }

    api.getSubscriptionPlans().then((data) => {
      setPlans(data);
      const requested = data.find((plan) => plan.id === requestedPlan || plan.name.toLowerCase().replace(/\s+/g, '-') === requestedPlan);
      if (requested) {
        setSelectedPlanId(requested.id);
      } else if (data[0]) {
        setSelectedPlanId(data[0].id);
      }
    }).catch(() => setError('Impossible de charger les plans d’abonnement.'));

    setPayerPhone(user.phone || '');
  }, [ready, requestedPlan, router, user]);

  const handlePay = async () => {
    if (!selectedPlanId) {
      setError('Veuillez choisir un plan.');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const result = await api.createSubscription(selectedPlanId, payerPhone, promotionCode.trim() || undefined);
      if (result.redirectUrl) {
        window.location.assign(result.redirectUrl);
        return;
      }

      setSuccess(true);
      setMessage(result.status === 'active'
        ? `Votre abonnement est actif${result.discountPercent ? ` avec une remise de ${result.discountPercent} %` : ''}.`
        : `Paiement initié${result.discountPercent ? ` avec une remise de ${result.discountPercent} %` : ''}. Référence : ${result.paymentReference || 'en attente de confirmation MoMo'}.`);
      if (result.paymentReference) {
        router.push(`/payment/callback?type=subscription&referenceId=${encodeURIComponent(result.paymentReference)}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Le paiement MoMo a échoué.');
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !user) {
    return <div className="p-8 text-center text-stone-600">Chargement...</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Paiement</p>
          <h1 className="mt-2 text-3xl font-semibold text-stone-900">
            {type === 'subscription' ? 'Abonnement ArtisanConnect' : 'Payer avec MoMo'}
          </h1>
        </div>
        <Link href="/dashboard" className="text-sm font-medium text-amber-700 underline">Retour au dashboard</Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Choisir un plan</h2>
          <div className="mt-4 space-y-3">
            {plans.length === 0 ? (
              <p className="text-sm text-stone-500">Aucun plan disponible pour le moment.</p>
            ) : (
              plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${selectedPlanId === plan.id ? 'border-amber-600 bg-amber-50' : 'border-stone-200 bg-stone-50 hover:border-stone-300'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-stone-900">{plan.name}</p>
                      <p className="mt-1 text-sm text-stone-600">{plan.description || 'Abonnement mensuel'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-stone-900">{Number(plan.price).toLocaleString('fr-FR')} FCFA</p>
                      <p className="text-xs text-stone-500">/{plan.durationDays} jours</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
          <p className="text-sm font-medium text-amber-700 uppercase tracking-[0.18em]">Paiement sécurisé</p>
          <h3 className="mt-3 text-2xl font-semibold text-stone-900">Payer avec MoMo</h3>
          <p className="mt-2 text-sm text-stone-600">Vous serez redirigé vers la procédure de paiement ou confirmé en mode sandbox selon la configuration actuelle.</p>

          <label htmlFor="payerPhone" className="mt-5 block text-sm font-medium text-stone-800">
            Numéro MoMo
          </label>
          <input
            id="payerPhone"
            type="tel"
            value={payerPhone}
            onChange={(event) => setPayerPhone(event.target.value)}
            placeholder="Ex: 237699000000"
            className="mt-2 w-full rounded-md border border-stone-200 px-3 py-2 text-sm outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
          />

          <label htmlFor="promotionCode" className="mt-5 block text-sm font-medium text-stone-800">
            Code promotionnel (facultatif)
          </label>
          <input
            id="promotionCode"
            type="text"
            value={promotionCode}
            onChange={(event) => setPromotionCode(event.target.value.toUpperCase())}
            placeholder="Ex: PILOTE2026"
            className="mt-2 w-full rounded-md border border-stone-200 px-3 py-2 text-sm uppercase outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-100"
          />
          <p className="mt-1 text-xs text-stone-500">Laissez vide si vous ne disposez pas d’un code.</p>

          {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {message && <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p>}

          <button
            type="button"
            onClick={() => void handlePay()}
            disabled={loading || !selectedPlanId}
            className="mt-6 w-full rounded-md bg-amber-700 px-4 py-3 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60 transition"
          >
            {loading ? 'Traitement...' : 'Payer avec MoMo'}
          </button>

          {success && (
            <div className="mt-5 rounded-md border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600">
              Paiement lancé avec succès. Vous pouvez retourner au dashboard ou vérifier votre statut d’abonnement.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

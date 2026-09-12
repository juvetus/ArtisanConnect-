'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setErrorMessage(t('email_verification_error'));
      return;
    }

    let isMounted = true;

    async function executeVerification() {
      try {
        const response = await api.verifyEmail(token!);
        if (isMounted) {
          setSuccess(true);
          setErrorMessage(null);
          // Mettre à jour l'utilisateur connecté s'il s'agit du même compte
          if (user && (!response.user || response.user.id === user.id)) {
            updateUser({ verifiedEmail: true });
          }
        }
      } catch (err) {
        if (isMounted) {
          setSuccess(false);
          if (err instanceof ApiError) {
            setErrorMessage(err.message);
          } else {
            setErrorMessage(t('email_verification_error'));
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token, user, updateUser, t]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = user?.email || resendEmail.trim();
    if (!targetEmail) return;

    setResending(true);
    setResendMessage(null);
    try {
      const res = await api.resendVerification(targetEmail);
      setResendMessage(res.message || t('email_verification_sent'));
    } catch (err) {
      if (err instanceof ApiError) {
        setResendMessage(err.message);
      } else {
        setResendMessage(t('email_verification_error'));
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-stone-200 bg-white p-8 shadow-xs text-center">
        <h1 className="text-2xl font-bold text-stone-900 mb-4">
          {t('email_verification_title')}
        </h1>

        {loading ? (
          <div className="py-8 space-y-4">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
            <p className="text-stone-600 font-medium">{t('email_verification_verifying')}</p>
          </div>
        ) : success ? (
          <div className="py-6 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-emerald-800">
                {t('email_verification_success')}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                Votre compte est maintenant complètement activé. Vous pouvez profiter de tous les services d&apos;ArtisanConnect.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                href={user?.role === 'artisan' ? '/dashboard' : user?.role === 'institution' ? '/institution' : '/'}
                className="rounded-lg bg-amber-700 px-5 py-2.5 font-medium text-white shadow-xs hover:bg-amber-800 transition"
              >
                {t('email_verification_go_dashboard')}
              </Link>
              <Link
                href="/"
                className="rounded-lg border border-stone-300 px-5 py-2.5 font-medium text-stone-700 hover:bg-stone-50 transition"
              >
                {t('email_verification_back_home')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-red-700">
                {errorMessage || t('email_verification_error')}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                Le lien de validation a peut-être expiré ou a déjà été utilisé.
              </p>
            </div>

            <div className="border-t border-stone-200 pt-6 text-left">
              <h2 className="text-sm font-semibold text-stone-800 mb-2">
                Recevoir un nouveau lien de confirmation
              </h2>
              <form onSubmit={handleResend} className="space-y-3">
                {!user && (
                  <input
                    type="email"
                    required
                    placeholder="Votre adresse email"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
                  />
                )}
                <button
                  type="submit"
                  disabled={resending}
                  className="w-full rounded-md bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60 transition"
                >
                  {resending ? t('action_loading') : t('email_verification_resend')}
                </button>
              </form>
              {resendMessage && (
                <p className="mt-3 text-xs font-medium text-amber-800 bg-amber-50 p-2.5 rounded border border-amber-200">
                  {resendMessage}
                </p>
              )}
            </div>

            <div className="pt-2">
              <Link href="/" className="text-sm font-medium text-amber-700 hover:underline">
                {t('email_verification_back_home')}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-lg p-8 text-center text-stone-600">
          Chargement...
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

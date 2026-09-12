'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useLanguage } from '@/lib/language-context';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { t } = useLanguage();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Jeton de réinitialisation manquant.');
      return;
    }

    if (password !== confirmPassword) {
      setError(t('reset_password_mismatch'));
      return;
    }

    if (password.length < 8) {
      setError('Le mot de passe doit comporter au moins 8 caractères.');
      return;
    }

    setPending(true);

    try {
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Une erreur est survenue lors de la réinitialisation.");
      }
    } finally {
      setPending(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-700">
          <p className="font-semibold">Lien de réinitialisation invalide ou absent.</p>
          <div className="mt-4">
            <Link href="/forgot-password" className="text-sm font-medium underline">
              Demander un nouveau lien de réinitialisation
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">{t('reset_password_title')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('reset_password_subtitle')}</p>

      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-6 shadow-xs">
        {success ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-base font-semibold text-emerald-800">
              {t('reset_password_success')}
            </p>
            <div className="pt-2">
              <Link
                href="/login"
                className="inline-block rounded-md bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800 transition"
              >
                {t('reset_password_login_now')}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                {t('reset_password_new_label')}
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              />
              <p className="mt-1 text-xs text-stone-500">8 caractères minimum.</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium">
                {t('reset_password_confirm_label')}
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60 transition"
            >
              {pending ? t('action_loading') : t('reset_password_submit')}
            </button>

            <p className="text-center text-sm text-stone-600 pt-2">
              <Link href="/login" className="text-amber-700 underline">
                {t('forgot_password_back_login')}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md p-8 text-center text-stone-600">
          Chargement...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

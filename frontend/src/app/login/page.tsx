'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [verificationMode, setVerificationMode] = useState<'email' | 'phone' | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationMessage, setVerificationMessage] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = identifier.trim();
    if (!value.includes('@') && !value.startsWith('+') && !value.startsWith('00')) {
      setError(t('login_phone_code_required'));
      return;
    }
    setPending(true);
    try {
      await login(value, password);
      router.push('/');
    } catch (err) {
      if (err instanceof ApiError && err.message.includes('adresse email')) {
        setVerificationMode('email');
        setError(t('login_verify_email_required'));
      } else if (err instanceof ApiError && err.message.includes('numéro de téléphone')) {
        setVerificationMode('phone');
        setError(t('login_verify_phone_required'));
      } else {
        setVerificationMode(null);
        setError('Email ou mot de passe incorrect / Incorrect email or password.');
      }
    } finally {
      setPending(false);
    }
  };

  const resendVerification = async () => {
    if (!verificationMode) return;
    setVerificationPending(true);
    setVerificationMessage('');
    try {
      if (verificationMode === 'email') {
        await api.resendVerification(identifier.trim());
        setVerificationMessage(t('email_verification_sent'));
      } else {
        const result = await api.resendPhoneVerification(identifier.trim());
        setVerificationMessage(result.developmentOtp
          ? `${result.message} Code de test : ${result.developmentOtp}`
          : t('login_verification_sent'));
      }
    } catch (err) {
      setVerificationMessage(err instanceof ApiError ? err.message : t('email_verification_error'));
    } finally {
      setVerificationPending(false);
    }
  };

  const verifyPhoneAndLogin = async () => {
    setVerificationPending(true);
    setVerificationMessage('');
    try {
      await api.verifyPhone(identifier.trim(), verificationCode);
      await login(identifier.trim(), password);
      router.push('/');
    } catch (err) {
      setVerificationMessage(err instanceof ApiError ? err.message : t('email_verification_error'));
    } finally {
      setVerificationPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">{t('login_title')}</h1>
      <p className="mt-1 text-sm text-stone-600">{t('login_subtitle')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-xs text-stone-600"><span className="text-red-700" aria-hidden="true">*</span> Champ obligatoire</p>
        <div>
          <label htmlFor="identifier" className="block text-sm font-medium">
            Email ou numéro de téléphone <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> (obligatoire)</span>
          </label>
          <input
            id="identifier"
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="email@exemple.com / +237 6XX XXX XXX"
            aria-describedby="identifier-help"
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
          />
          <p id="identifier-help" className="mt-1 text-xs text-stone-500">{t('login_phone_hint')}</p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium">
              {t('login_password')} <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> (obligatoire)</span>
            </label>
            <Link href="/forgot-password" className="text-xs text-amber-700 hover:underline">
              {t('login_forgot_password')}
            </Link>
          </div>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 pr-20 outline-none focus:border-amber-600"
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-amber-800 hover:text-amber-950" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {verificationMode ? <section className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4" aria-live="polite">
          {verificationMode === 'phone' ? <>
            <label htmlFor="verification-code" className="block text-sm font-medium text-stone-800">{t('login_phone_code')}</label>
            <input id="verification-code" inputMode="numeric" autoComplete="one-time-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full rounded-md border border-stone-300 px-3 py-2" />
            <button type="button" onClick={() => void verifyPhoneAndLogin()} disabled={verificationPending || verificationCode.length !== 6} className="w-full rounded-md bg-green-700 py-2 text-sm font-medium text-white disabled:opacity-60">{t('login_verify_phone')}</button>
          </> : null}
          <button type="button" onClick={() => void resendVerification()} disabled={verificationPending} className="w-full rounded-md border border-amber-700 px-3 py-2 text-sm font-medium text-amber-900 disabled:opacity-60">
            {verificationPending ? t('action_loading') : verificationMode === 'email' ? t('email_verification_resend') : t('login_phone_resend')}
          </button>
          {verificationMessage ? <p className="text-sm text-stone-700">{verificationMessage}</p> : null}
        </section> : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending ? t('action_loading') : t('login_submit')}
        </button>

        <p className="text-center text-sm text-stone-600">
          {t('login_no_account')}{' '}
          <Link href="/register" className="text-amber-700 underline">
            {t('login_create_account')}
          </Link>
        </p>
      </form>
    </div>
  );
}

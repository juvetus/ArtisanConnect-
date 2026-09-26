'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
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
    } catch {
      setError('Email ou mot de passe incorrect / Incorrect email or password.');
    } finally {
      setPending(false);
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

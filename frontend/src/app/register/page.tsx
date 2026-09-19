'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Role } from '@/lib/types';
import { PHONE_COUNTRIES } from '@/lib/countries';

export default function RegisterPage() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+237');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpExpected, setPhoneOtpExpected] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('client');
  const [gender, setGender] = useState<'female' | 'male' | 'cooperative' | 'other'>('female');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const result = await register({ name, email: contactType === 'email' ? email : undefined, phone: contactType === 'phone' ? `${phoneCountry}${phone}` : undefined, password, role, gender });
      if (contactType === 'phone') {
        setPhoneOtpExpected(result.developmentOtp ?? null);
        return;
      }
      router.push(role === 'artisan' ? '/dashboard' : role === 'institution' ? '/institution' : '/');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError('Cet email est déjà associé à un compte. Veuillez vous connecter.');
        } else {
          setError(err.message || "L'inscription a échoué. Veuillez vérifier vos informations.");
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("L'inscription a échoué. Réessayez.");
      }
    } finally {
      setPending(false);
    }
  };

  const verifyPhone = async () => {
    try {
      await api.verifyPhone(`${phoneCountry}${phone}`, phoneOtp);
      router.push('/login');
    } catch (error) {
      setError(error instanceof ApiError ? error.message : 'Code de vérification invalide ou expiré.');
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold">{t('register_title')}</h1>
      <p className="mt-1 text-sm text-stone-600">
        {t('register_subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-2 text-sm font-medium">{t('register_i_am')}</legend>
          {(['client', 'artisan', 'institution'] as const).map((value) => (
            <label
              key={value}
              className={`cursor-pointer rounded-md border px-3 py-3 text-center text-sm ${
                role === value
                  ? 'border-amber-600 bg-amber-50 font-medium text-amber-900'
                  : 'border-stone-300 hover:bg-stone-50'
              }`}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
              />
              {value === 'client' ? t('role_client') : value === 'artisan' ? t('role_artisan') : t('role_institution')}
            </label>
          ))}
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium">Créer avec</legend>
          <button type="button" onClick={() => setContactType('email')} className={`rounded-md border px-3 py-2 text-sm ${contactType === 'email' ? 'border-amber-600 bg-amber-50' : 'border-stone-300'}`}>Email</button>
          <button type="button" onClick={() => setContactType('phone')} className={`rounded-md border px-3 py-2 text-sm ${contactType === 'phone' ? 'border-amber-600 bg-amber-50' : 'border-stone-300'}`}>Téléphone</button>
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {t('register_name')}
          </label>
          <input
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
          />
        </div>

        {role === 'artisan' && (
          <div>
            <label className="block text-sm font-medium text-stone-700">{t('register_profile_type')}</label>
            <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
              {[
                { value: 'female', label: t('gender_female') },
                { value: 'cooperative', label: t('gender_cooperative') },
                { value: 'male', label: t('gender_male') },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setGender(opt.value as typeof gender)}
                  className={`rounded border p-2 text-center transition-colors ${
                    gender === opt.value
                      ? 'border-rose-600 bg-rose-50 font-semibold text-rose-900'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {contactType === 'email' ? <div>
          <label htmlFor="email" className="block text-sm font-medium">
            {t('login_email')}
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
          />
        </div> : <div>
          <label htmlFor="phone" className="block text-sm font-medium">Numéro de téléphone</label>
          <div className="mt-1 flex gap-2">
            <select value={phoneCountry} onChange={(e) => setPhoneCountry(e.target.value)} className="w-36 rounded-md border border-stone-300 px-2 py-2 text-sm outline-none focus:border-amber-600" aria-label="Pays et indicatif">
              {PHONE_COUNTRIES.map((country) => <option key={`${country.code}-${country.dialCode}`} value={country.dialCode}>{country.name} ({country.dialCode})</option>)}
            </select>
            <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="6XX XXX XXX" className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600" />
          </div>
          <p className="mt-1 text-xs text-stone-500">Choisissez le pays puis saisissez le numéro sans l’indicatif.</p>
        </div>}

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            {t('login_password')}
          </label>
          <div className="relative mt-1">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-stone-300 px-3 py-2 pr-20 outline-none focus:border-amber-600"
            />
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-amber-800 hover:text-amber-950" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
              {showPassword ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">8 caractères minimum / min 8 chars.</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {phoneOtpExpected ? <div className="space-y-3 rounded-md bg-amber-50 p-4"><p className="text-sm text-stone-700">Code OTP de test : <strong>{phoneOtpExpected}</strong></p><input value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder="Code à 6 chiffres" className="w-full rounded-md border border-stone-300 px-3 py-2" /><button type="button" onClick={() => void verifyPhone()} className="w-full rounded-md bg-green-700 py-2 font-medium text-white">Vérifier le numéro</button></div> : <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending ? t('action_loading') : t('register_submit')}
        </button>}

        <p className="text-center text-sm text-stone-600">
          {t('register_already_account')}{' '}
          <Link href="/login" className="text-amber-700 underline">
            {t('register_login_link')}
          </Link>
        </p>
      </form>
    </div>
  );
}

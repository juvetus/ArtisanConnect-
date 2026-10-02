'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { Role } from '@/lib/types';
import { PHONE_COUNTRIES } from '@/lib/countries';

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-600">Chargement…</p>}>
      <RegisterFlow />
    </Suspense>
  );
}

function RegisterFlow() {
  const { register } = useAuth();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');
  const selectedRole: Role | null = roleParam === 'client' || roleParam === 'artisan' || roleParam === 'institution' ? roleParam : null;
  const role = selectedRole ?? 'client';
  const nextParam = searchParams.get('next');
  const returnTo = nextParam?.startsWith('/') && !nextParam.startsWith('//') ? nextParam : null;
  const loginHref = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [phone, setPhone] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('+237');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpExpected, setPhoneOtpExpected] = useState<string | null>(null);
  const [phoneAccountCreated, setPhoneAccountCreated] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailAccountCreated, setEmailAccountCreated] = useState(false);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [emailResending, setEmailResending] = useState(false);
  const [emailResendMessage, setEmailResendMessage] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [gender, setGender] = useState<'female' | 'male' | 'cooperative' | 'other'>('female');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setPending(true);
    try {
      const result = await register({ name, email: contactType === 'email' ? email : undefined, phone: contactType === 'phone' ? `${phoneCountry}${phone}` : undefined, password, role, gender });
      if (role === 'institution') {
        setError('Votre demande institutionnelle a été reçue. Elle sera vérifiée par notre équipe avant activation. Vous recevrez une confirmation par e-mail.');
        return;
      }
      if (contactType === 'phone') {
        setPhoneAccountCreated(true);
        setPhoneOtpExpected(result.developmentOtp ?? null);
        return;
      }
      setVerificationEmailSent(result.verificationEmailSent === true);
      setEmailAccountCreated(true);
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
      setError('');
      setPhoneVerified(true);
    } catch (error) {
      setError(error instanceof ApiError ? error.message : 'Code de vérification invalide ou expiré.');
    }
  };

  const resendEmailVerification = async () => {
    setEmailResending(true);
    setEmailResendMessage('');
    try {
      const result = await api.resendVerification(email.trim());
      setVerificationEmailSent(true);
      setEmailResendMessage(result.message);
    } catch (err) {
      setEmailResendMessage(err instanceof ApiError ? err.message : t('email_verification_error'));
    } finally {
      setEmailResending(false);
    }
  };

  if (!selectedRole) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">ArtisanConnect</p>
          <h1 className="mt-1 text-3xl font-semibold text-stone-900">{t('register_choose_path')}</h1>
          <p className="mt-2 text-stone-600">{t('register_choose_path_desc')}</p>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          {([
            ['client', t('register_client_path'), t('register_client_path_desc')],
            ['artisan', t('register_artisan_path'), t('register_artisan_path_desc')],
            ['institution', t('register_institution_path'), t('register_institution_path_desc')],
          ] as const).map(([value, title, description]) => (
            <Link key={value} href={`/register?role=${value}${returnTo ? `&next=${encodeURIComponent(returnTo)}` : ''}`} className="flex min-h-40 flex-col rounded-lg border border-stone-200 bg-white p-5 transition hover:border-amber-600 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
              <span className="font-semibold text-stone-900">{title}</span>
              <span className="mt-2 flex-1 text-sm leading-6 text-stone-600">{description}</span>
              <span className="mt-4 text-sm font-semibold text-amber-800">{t('register_continue')} →</span>
            </Link>
          ))}
        </div>
        <p className="text-center text-sm text-stone-600">
          {t('register_already_account')} <Link href={loginHref} className="font-medium text-amber-800 underline">{t('register_login_link')}</Link>
        </p>
      </div>
    );
  }

  const roleTitle = role === 'client' ? t('register_client_path') : role === 'artisan' ? t('register_artisan_path') : t('register_institution_path');

  return (
    <div className="mx-auto max-w-md">
      <Link href={`/register${returnTo ? `?next=${encodeURIComponent(returnTo)}` : ''}`} className="text-sm font-medium text-amber-800 hover:underline">← {t('register_change_path')}</Link>
      <h1 className="mt-3 text-2xl font-semibold">{roleTitle}</h1>
      <p className="mt-1 text-sm text-stone-600">{role === 'client' ? t('register_client_path_desc') : role === 'artisan' ? t('register_artisan_path_desc') : t('register_institution_path_desc')}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-lg border border-stone-200 bg-white p-6">
        <p className="text-xs text-stone-600"><span className="text-red-700" aria-hidden="true">*</span> {t('form_required')}</p>

        <fieldset className="grid grid-cols-2 gap-2">
          <legend className="mb-2 text-sm font-medium">{t('register_with')}</legend>
          <button type="button" onClick={() => setContactType('email')} className={`min-h-12 rounded-md border px-3 py-2 text-sm ${contactType === 'email' ? 'border-amber-600 bg-amber-50' : 'border-stone-300'}`}>Email</button>
          <button type="button" onClick={() => setContactType('phone')} className={`min-h-12 rounded-md border px-3 py-2 text-sm ${contactType === 'phone' ? 'border-amber-600 bg-amber-50' : 'border-stone-300'}`}>{t('register_phone')}</button>
        </fieldset>

        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {t('register_name')} <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> ({t('form_required').toLowerCase()})</span>
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
            {t('login_email')} <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> ({t('form_required').toLowerCase()})</span>
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
          <label htmlFor="phone" className="block text-sm font-medium">{t('register_phone_label')} <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> ({t('form_required').toLowerCase()})</span></label>
          <div className="mt-1 flex gap-2">
            <select value={phoneCountry} onChange={(e) => setPhoneCountry(e.target.value)} className="w-36 rounded-md border border-stone-300 px-2 py-2 text-sm outline-none focus:border-amber-600" aria-label={t('register_phone_country')}>
              {PHONE_COUNTRIES.map((country) => <option key={`${country.code}-${country.dialCode}`} value={country.dialCode}>{country.name} ({country.dialCode})</option>)}
            </select>
            <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="6XX XXX XXX" className="min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600" />
          </div>
          <p className="mt-1 text-xs text-stone-500">{t('register_phone_help')}</p>
        </div>}

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            {t('login_password')} <span className="text-red-700" aria-hidden="true">*</span><span className="sr-only"> ({t('form_required').toLowerCase()})</span>
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
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 px-3 text-sm font-medium text-amber-800 hover:text-amber-950" aria-label={showPassword ? t('register_password_hide') : t('register_password_show')}>
              {showPassword ? t('register_password_hide') : t('register_password_show')}
            </button>
          </div>
          <p className="mt-1 text-xs text-stone-500">{t('register_password_hint')}</p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {phoneVerified ? <div role="status" className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4"><p className="text-sm font-medium text-green-800">{t('register_phone_success', { phone: `${phoneCountry}${phone}` })}</p><Link href={loginHref} className="block w-full rounded-md bg-green-700 py-2 text-center font-medium text-white">{t('register_login_link')}</Link></div> : phoneAccountCreated ? <div className="space-y-3 rounded-md bg-amber-50 p-4"><p role="status" className="text-sm font-medium text-stone-800">{t('register_phone_created')}</p>{phoneOtpExpected ? <p className="text-sm text-stone-700">{t('register_phone_test_code')} <strong>{phoneOtpExpected}</strong></p> : null}<input value={phoneOtp} onChange={(e) => setPhoneOtp(e.target.value)} placeholder={t('register_phone_code_placeholder')} inputMode="numeric" className="w-full rounded-md border border-stone-300 px-3 py-2" /><button type="button" onClick={() => void verifyPhone()} className="w-full rounded-md bg-green-700 py-2 font-medium text-white">{t('register_phone_verify')}</button></div> : emailAccountCreated ? <div role="status" className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4"><p className="text-sm font-medium text-stone-800">{verificationEmailSent ? t('register_email_created') : t('register_email_send_failed')}</p>{emailResendMessage ? <p className="text-sm text-stone-700">{emailResendMessage}</p> : null}<button type="button" onClick={() => void resendEmailVerification()} disabled={emailResending} className="w-full rounded-md bg-amber-700 py-2 font-medium text-white disabled:opacity-60">{emailResending ? t('action_loading') : t('register_email_resend')}</button><Link href={loginHref} className="block text-center text-sm font-medium text-amber-800 underline">{t('register_login_link')}</Link></div> : <button
          type="submit"
          disabled={pending}
          className="min-h-12 w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {pending ? t('action_loading') : t('register_submit')}
        </button>}

        <p className="text-center text-sm text-stone-600">
          {t('register_already_account')}{' '}
          <Link href={loginHref} className="text-amber-700 underline">
            {t('register_login_link')}
          </Link>
        </p>
      </form>
    </div>
  );
}

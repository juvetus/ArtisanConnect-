'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export function EmailVerificationBanner() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // N'afficher que si l'utilisateur est connecté et que son email n'est pas vérifié
  if (!user || user.verifiedEmail === true || dismissed) {
    return null;
  }

  const handleResend = async () => {
    setSending(true);
    setStatusMessage(null);
    setIsError(false);
    try {
      const res = await api.resendVerification(user.email);
      setStatusMessage(res.message || t('email_verification_sent'));
    } catch (err) {
      setIsError(true);
      if (err instanceof ApiError) {
        setStatusMessage(err.message);
      } else {
        setStatusMessage(t('email_verification_error'));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm text-amber-950 shadow-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base" role="img" aria-label="email">✉️</span>
          <span>{t('email_verification_banner')}</span>
          {statusMessage && (
            <span className={`font-medium ${isError ? 'text-red-700' : 'text-emerald-800'}`}>
              • {statusMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="rounded bg-amber-700 px-3 py-1 text-xs font-semibold text-white transition hover:bg-amber-800 disabled:opacity-50"
          >
            {sending ? t('action_loading') : t('email_verification_resend')}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-amber-800 hover:text-amber-950 p-1"
            title="Masquer"
            aria-label="Masquer le bandeau"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

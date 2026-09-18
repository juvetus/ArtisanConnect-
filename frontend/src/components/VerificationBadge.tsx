'use client';

import { useLanguage } from '@/lib/language-context';
import type { VerificationLevel } from '@/lib/types';

const STYLES: Record<VerificationLevel, { className: string; icon: string }> = {
  none: { className: 'bg-stone-100 text-stone-600', icon: '•' },
  phone: { className: 'bg-blue-50 text-blue-800', icon: '📞' },
  profile: { className: 'bg-amber-50 text-amber-800', icon: '📋' },
  identity: { className: 'bg-emerald-50 text-emerald-800', icon: '✔' },
  recommended: { className: 'bg-emerald-700 text-white', icon: '★' },
};

const LABEL_KEYS = {
  none: ['verif_none', 'verif_none_hint'],
  phone: ['verif_phone', 'verif_phone_hint'],
  profile: ['verif_profile', 'verif_profile_hint'],
  identity: ['verif_identity', 'verif_identity_hint'],
  recommended: ['verif_recommended', 'verif_recommended_hint'],
} as const;

export function VerificationBadge({ level, className = '' }: { level: VerificationLevel; className?: string }) {
  const { t } = useLanguage();
  const style = STYLES[level];
  const [labelKey, hintKey] = LABEL_KEYS[level];

  return (
    <span
      title={t(hintKey)}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.className} ${className}`}
    >
      <span aria-hidden>{style.icon}</span>
      {t(labelKey)}
    </span>
  );
}

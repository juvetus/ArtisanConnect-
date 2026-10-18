'use client';

import { useLanguage } from '@/lib/language-context';
import { CONTACT_WHATSAPP_HREF } from '@/lib/contact';

export function WhatsAppFloatingButton() {
  const { t } = useLanguage();
  const message = encodeURIComponent(t('whatsapp_default_message'));
  const href = `${CONTACT_WHATSAPP_HREF}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={t('whatsapp_aria_label')}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-lg ring-4 ring-white transition hover:bg-green-700 focus:outline-none focus:ring-green-200"
    >
      WA
    </a>
  );
}

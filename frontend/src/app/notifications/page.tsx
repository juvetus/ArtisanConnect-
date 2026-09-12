'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { NotificationItem } from '@/lib/types';

export default function NotificationsPage() {
  const { user, ready } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();

  const typeLabels: Record<NotificationItem['type'], string> = {
    new_order: language === 'en' ? '🛒 Order' : '🛒 Commande',
    order_status: language === 'en' ? '📦 Order' : '📦 Commande',
    payment: language === 'en' ? '💰 Payment' : '💰 Paiement',
    shop_review: language === 'en' ? '🏪 Shop' : '🏪 Boutique',
    service_review: language === 'en' ? '🧰 Service' : '🧰 Service',
    general: language === 'en' ? '🔔 Info' : '🔔 Info',
  };

  const { data, isLoading, mutate } = useSWR(user ? 'notifications' : null, () =>
    api.notifications(),
  );

  useEffect(() => {
    if (ready && !user) router.push('/login');
  }, [ready, user, router]);

  if (!ready || !user || isLoading || !data) return <p className="text-stone-600">{t('action_loading')}</p>;

  const markRead = async (notification: NotificationItem) => {
    if (!notification.read) await api.markNotificationRead(notification.id);
    await mutate();
    if (notification.link) router.push(notification.link);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('notifications_title')}</h1>
        {data.unreadCount > 0 && (
          <button
            onClick={async () => {
              await api.markAllNotificationsRead();
              await mutate();
            }}
            className="text-sm text-amber-700 underline"
          >
            {t('notifications_mark_all_read')}
          </button>
        )}
      </div>

      {data.items.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-600">
          {t('notifications_empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {data.items.map((notification) => (
            <li
              key={notification.id}
              onClick={() => markRead(notification)}
              className={`cursor-pointer rounded-lg border p-4 transition ${
                notification.read
                  ? 'border-stone-200 bg-white hover:border-stone-300'
                  : 'border-amber-400 bg-amber-50/60 hover:bg-amber-50'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-stone-600">
                      {typeLabels[notification.type]}
                    </span>
                    {!notification.read && (
                      <span className="h-2 w-2 rounded-full bg-amber-600" />
                    )}
                  </div>
                  <p className="font-medium text-stone-900">{notification.title}</p>
                  <p className="text-sm text-stone-600">{notification.content}</p>
                </div>
                <span className="shrink-0 text-xs text-stone-500">
                  {new Date(notification.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fr-FR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

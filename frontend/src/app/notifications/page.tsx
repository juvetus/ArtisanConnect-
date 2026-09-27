'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import type { NotificationItem } from '@/lib/types';

export default function NotificationsPage() {
  const { user, ready } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const pageSize = 10;

  const typeLabels: Record<NotificationItem['type'], string> = {
    new_order: language === 'en' ? '🛒 Order' : '🛒 Commande',
    order_status: language === 'en' ? '📦 Order' : '📦 Commande',
    payment: language === 'en' ? '💰 Payment' : '💰 Paiement',
    shop_review: language === 'en' ? '🏪 Shop' : '🏪 Boutique',
    service_review: language === 'en' ? '🧰 Service' : '🧰 Service',
    general: language === 'en' ? '🔔 Info' : '🔔 Info',
  };

  const activeSearch = user?.role === 'admin' ? search.trim() : '';
  const { data, isLoading, mutate } = useSWR(user ? ['notifications', user.id, page, activeSearch] : null, () =>
    api.notifications(page * pageSize, pageSize, activeSearch),
    { refreshInterval: 10000, revalidateOnFocus: true },
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

      {user.role === 'admin' ? (
        <label className="block text-sm font-medium text-stone-700">
          Rechercher dans les notifications
          <input
            type="search"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(0); }}
            placeholder="Titre ou contenu"
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-amber-600 sm:max-w-xl"
          />
        </label>
      ) : null}

      {data.items.length === 0 ? (
        <p className="rounded-lg border border-stone-200 bg-white p-8 text-center text-stone-600">
          {activeSearch ? 'Aucune notification ne correspond à cette recherche.' : t('notifications_empty')}
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
      {data.total > pageSize ? (
        <nav aria-label="Pagination des notifications" className="flex items-center justify-between border-t border-stone-200 pt-4">
          <p className="text-sm text-stone-600">{page * pageSize + 1}–{Math.min((page + 1) * pageSize, data.total)} sur {data.total}</p>
          <div className="flex gap-2">
            <button type="button" disabled={page === 0 || isLoading} onClick={() => setPage((current) => Math.max(0, current - 1))} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 disabled:opacity-50">Précédent</button>
            <button type="button" disabled={(page + 1) * pageSize >= data.total || isLoading} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 disabled:opacity-50">Suivant</button>
          </div>
        </nav>
      ) : null}
    </div>
  );
}

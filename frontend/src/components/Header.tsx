'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';

export function Header() {
  const { user, ready, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass = (href: string) => `rounded-md px-3 py-2 transition-colors whitespace-nowrap ${
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))
      ? 'bg-amber-50 font-bold text-amber-800 ring-1 ring-amber-200'
      : 'text-stone-700 hover:bg-stone-100'
  }`;

  const { data: unread } = useSWR(user ? 'unread' : null, () => api.unreadCount(), {
    refreshInterval: 20000,
  });

  const { data: notifUnread } = useSWR(user ? 'notif-unread' : null, () => api.notificationsUnread(), {
    refreshInterval: 20000,
  });

  const { data: opportunityUnread } = useSWR(user?.role === 'artisan' ? 'opportunity-notifications-unread' : null, () => api.notificationsOpportunitiesUnread(), {
    refreshInterval: 20000,
  });

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    router.push('/');
  };

  return (
    <header className="border-b border-stone-200 bg-white md:fixed md:inset-y-0 md:left-0 md:z-40 md:flex md:w-64 md:flex-col md:border-r md:border-b-0">
      <div className="relative mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4 px-6 py-4 md:h-full md:min-h-0 md:flex-col md:items-stretch md:justify-start md:gap-6 md:px-4 md:py-6">
        <div className="flex items-center gap-4 md:justify-between">
          <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
            Artisan<span className="text-amber-700">Connect</span>
          </Link>

          {/* Sélecteur de langue bilingue (Cameroun : FR / EN) */}
          <div className="flex items-center rounded-full border border-stone-200 bg-stone-50 p-0.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('fr')}
              className={`rounded-full px-2 py-0.5 transition-colors ${
                language === 'fr'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="Français"
            >
              🇫🇷 FR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-full px-2 py-0.5 transition-colors ${
                language === 'en'
                  ? 'bg-amber-700 text-white shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
              title="English"
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="main-navigation"
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-md border border-stone-300 px-3 py-2 text-stone-700 hover:bg-stone-100 md:hidden"
        >
          <span aria-hidden>{menuOpen ? '✕' : '☰'}</span>
        </button>

        <nav
          id="main-navigation"
          onClick={() => setMenuOpen(false)}
          className={`${menuOpen ? 'flex' : 'hidden'} order-3 max-h-[calc(100vh-8rem)] min-w-0 w-full min-h-0 flex-col items-stretch gap-1 overflow-auto border-t border-stone-200 pt-3 text-sm md:order-none md:flex md:max-h-none md:w-full md:flex-1 md:flex-col md:items-stretch md:justify-start md:gap-1 md:overflow-y-auto md:border-t-0 md:border-0 md:pt-0 md:text-sm [&>a]:shrink-0 [&>a]:whitespace-nowrap [&>a]:px-2 [&>a]:py-2 [&>button]:shrink-0 [&>button]:whitespace-nowrap [&>button]:px-2 [&>button]:py-2`}
        >
          <Link href="/annonces" className={navLinkClass('/annonces')}>
            {t('nav_listings')}
          </Link>
          <Link href="/trouver-un-artisan" className={navLinkClass('/trouver-un-artisan')}>
            {t('nav_find_artisan')}
          </Link>
          {user?.role !== 'artisan' ? (
            <Link href="/services" className={navLinkClass('/services')}>
              {t('nav_services')}
            </Link>
          ) : null}
          <Link href="/how-it-works" className={navLinkClass('/how-it-works')}>
            {t('nav_how_it_works')}
          </Link>
          {user?.role !== 'client' ? (
            <Link href="/tarifs" className={navLinkClass('/tarifs')}>
              {t('nav_pricing')}
            </Link>
          ) : null}
          <Link href="/blog" className={navLinkClass('/blog')}>
            Blog
          </Link>
          {!user || (user.role !== 'client' && user.role !== 'artisan') ? (
            <Link href="/institutions" className={navLinkClass('/institutions')}>
              {t('nav_institutions')}
            </Link>
          ) : null}
          {!ready ? null : user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className={navLinkClass('/admin')}
                >
                  {t('nav_admin')}
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  href="/admin/services"
                  className={navLinkClass('/admin/services')}
                >
                  {t('nav_validate_services')}
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  href="/admin/service-orders"
                  className={navLinkClass('/admin/service-orders')}
                >
                  {t('nav_service_requests')}
                </Link>
              )}
              {user.role === 'admin' && (
                <Link href="/admin/customer-requests" className={navLinkClass('/admin/customer-requests')}>
                  Demandes sans artisan
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link href="/shop/create" className={navLinkClass('/shop/create')}>
                  {t('nav_create_shop')}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link
                  href="/dashboard"
                  className={navLinkClass('/dashboard')}
                >
                  {t('nav_my_workshop')}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link
                  href="/artisan/services"
                  className={navLinkClass('/artisan/services')}
                >
                  {t('nav_my_services')}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link
                  href="/artisan/service-orders"
                  className={navLinkClass('/artisan/service-orders')}
                >
                  {t('nav_received_requests')}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link href="/artisan/customer-requests" className={`${navLinkClass('/artisan/customer-requests')} flex items-center justify-between gap-2`}>
                  {t('nav_opportunities')}
                  {opportunityUnread && opportunityUnread.unreadCount > 0 ? <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold text-white">{opportunityUnread.unreadCount}</span> : null}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link href="/assistant" className={navLinkClass('/assistant')}>
                  {t('nav_assistant')}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link href="/assistant/images" className={navLinkClass('/assistant/images')}>
                  {language === 'en' ? 'AI Image Studio' : 'Studio images IA'}
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link href="/formalization" className={navLinkClass('/formalization')}>
                  {t('nav_formalization')}
                </Link>
              )}
              {(user.role === 'artisan' || user.role === 'admin') && (
                <Link href="/resources" className={navLinkClass('/resources')}>
                  {t('nav_resources')}
                </Link>
              )}
              {user.role === 'institution' && (
                <Link href="/institution" className={navLinkClass('/institution')}>
                  {t('nav_institution_space')}
                </Link>
              )}
              <Link href="/profile" className={navLinkClass('/profile')}>
                {t('nav_profile')}
              </Link>
              {user.role === 'client' && (
                <Link href="/customer-requests" className={navLinkClass('/customer-requests')}>
                  {t('nav_find_artisan')}
                </Link>
              )}
              <Link
                href="/notifications"
                className={`relative ${navLinkClass('/notifications')}`}
                aria-label={t('nav_notifications')}
              >
                🔔
                {notifUnread && notifUnread.unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white">
                    {notifUnread.unreadCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/orders"
                className={navLinkClass('/orders')}
              >
                {t('nav_my_orders')}
              </Link>
              <Link
                href="/messages"
                className={`relative ${navLinkClass('/messages')}`}
              >
                {t('nav_messages')}
                {unread && unread.unreadCount > 0 ? (
                  <span className="ml-1 rounded-full bg-amber-700 px-1.5 py-0.5 text-xs text-white">
                    {unread.unreadCount}
                  </span>
                ) : null}
              </Link>
              <span className="hidden px-2 text-stone-500 sm:inline">{user?.name}</span>
              <button
                onClick={handleLogout}
                className={navLinkClass('/login')}
              >
                {t('nav_logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
              >
                {t('nav_login')}
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-amber-700 px-3 py-2 font-bold text-white hover:bg-amber-800"
              >
                {t('nav_register')}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

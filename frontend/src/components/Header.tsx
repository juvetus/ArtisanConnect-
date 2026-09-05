'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export function Header() {
  const { user, ready, logout } = useAuth();
  const router = useRouter();

  const { data: unread } = useSWR(user ? 'unread' : null, () => api.unreadCount(), {
    refreshInterval: 20000,
  });

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-stone-900">
          Artisan<span className="text-amber-700">Connect</span>
        </Link>

        <nav className="flex items-center gap-2 text-sm">
          {!ready ? null : user ? (
            <>
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  className="rounded-md px-3 py-2 font-medium text-amber-800 hover:bg-amber-50"
                >
                  Administration
                </Link>
              )}
              {user.role === 'artisan' && (
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
                >
                  Mon atelier
                </Link>
              )}
              <Link
                href="/orders"
                className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
              >
                Mes commandes
              </Link>
              <Link
                href="/messages"
                className="relative rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
              >
                Messages
                {unread && unread.unreadCount > 0 ? (
                  <span className="ml-1 rounded-full bg-amber-700 px-1.5 py-0.5 text-xs text-white">
                    {unread.unreadCount}
                  </span>
                ) : null}
              </Link>
              <span className="hidden px-2 text-stone-500 sm:inline">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
              >
                Déconnexion
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-stone-700 hover:bg-stone-100"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-amber-700 px-3 py-2 font-medium text-white hover:bg-amber-800"
              >
                Créer un compte
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

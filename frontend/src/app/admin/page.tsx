'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import type { Listing, Order, User } from '@/lib/types';

export default function AdminPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<'overview' | 'users' | 'listings'>('overview');

  const { data, isLoading, mutate } = useSWR(
    user?.role === 'admin' ? 'admin-console' : null,
    async () => {
      const [overview, users, listings] = await Promise.all([
        api.adminOverview(),
        api.adminUsers(),
        api.adminListings(),
      ]);
      return { overview, users, listings };
    },
  );

  useEffect(() => {
    if (ready && user?.role !== 'admin') router.replace('/');
  }, [ready, user, router]);

  if (!ready || user?.role !== 'admin' || isLoading || !data) {
    return <p className="text-stone-600">Chargement de l&apos;administration…</p>;
  }

  const { stats, recentOrders } = data.overview;

  const moderateListing = async (listing: Listing) => {
    await api.adminSetListingStatus(listing.id, listing.status === 'active' ? 'inactive' : 'active');
    await mutate();
  };

  const changeRole = async (member: User) => {
    const role = member.role === 'artisan' ? 'client' : 'artisan';
    await api.adminSetUserRole(member.id, role);
    await mutate();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Pilotage</p>
          <h1 className="text-3xl font-semibold">Administration</h1>
          <p className="mt-1 text-stone-600">Vue opérationnelle de la marketplace camerounaise.</p>
        </div>
        <div className="flex rounded-lg border border-stone-200 bg-white p-1 text-sm">
          {[
            ['overview', 'Synthèse'],
            ['users', 'Utilisateurs'],
            ['listings', 'Annonces'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setView(value as typeof view)}
              className={`rounded-md px-3 py-2 ${
                view === value ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Utilisateurs', stats.users, `${stats.artisans} artisans · ${stats.clients} clients`],
          ['Annonces actives', stats.listings, 'Produits et services visibles'],
          ['Commandes', stats.orders, `${stats.pendingPayments} paiement(s) en attente`],
          ['Volume terminé', formatXAF(stats.revenue), `Commission : ${formatXAF(stats.platformFees)}`],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-600">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-stone-500">{detail}</p>
          </div>
        ))}
      </section>

      {view === 'overview' && <RecentOrders orders={recentOrders} />}

      {view === 'users' && (
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-5">
            <h2 className="font-semibold">Utilisateurs</h2>
            <p className="mt-1 text-sm text-stone-600">Les mots de passe ne sont jamais exposés.</p>
          </div>
          <div className="divide-y divide-stone-100">
            {data.users.map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-stone-600">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs capitalize">{member.role}</span>
                  {member.role !== 'admin' && (
                    <button
                      onClick={() => changeRole(member)}
                      className="text-sm text-amber-700 underline"
                    >
                      Passer {member.role === 'artisan' ? 'client' : 'artisan'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {view === 'listings' && (
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-5">
            <h2 className="font-semibold">Modération des annonces</h2>
            <p className="mt-1 text-sm text-stone-600">Désactivez une annonce qui ne respecte pas les règles.</p>
          </div>
          <div className="divide-y divide-stone-100">
            {data.listings.map((listing) => (
              <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{listing.title}</p>
                  <p className="text-sm text-stone-600">
                    {listing.seller?.name} · {formatXAF(listing.price)} · {listing.category}
                  </p>
                </div>
                <button
                  onClick={() => moderateListing(listing)}
                  className={`rounded-md px-3 py-2 text-sm font-medium ${
                    listing.status === 'active'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-green-50 text-green-700 hover:bg-green-100'
                  }`}
                >
                  {listing.status === 'active' ? 'Désactiver' : 'Réactiver'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RecentOrders({ orders }: { orders: Order[] }) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-5">
        <h2 className="font-semibold">Dernières commandes</h2>
        <p className="mt-1 text-sm text-stone-600">Suivi des transactions les plus récentes.</p>
      </div>
      <div className="divide-y divide-stone-100">
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-stone-600">Aucune commande pour le moment.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{order.listing?.title ?? 'Annonce supprimée'}</p>
                <p className="text-sm text-stone-600">
                  {order.buyer?.name} → {order.seller?.name} · {order.paymentMethod}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">{formatXAF(order.totalPrice)}</span>
                <StatusBadge status={order.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

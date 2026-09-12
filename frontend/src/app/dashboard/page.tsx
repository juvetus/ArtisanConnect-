'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import type { ListingType, Order } from '@/lib/types';

export default function DashboardPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const isArtisan = user?.role === 'artisan';

  const { data, isLoading, mutate } = useSWR(
    isArtisan ? ['atelier', user.id] : null,
    async ([, sellerId]) => {
      const [listings, [orders]] = await Promise.all([
        api.sellerListings(sellerId),
        api.sellerOrders(sellerId),
      ]);
      return { listings, orders };
    },
  );

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('vannerie');
  const [type, setType] = useState<ListingType>('product');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (ready && !isArtisan) router.push('/');
  }, [ready, isArtisan, router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setFormError('');
    try {
      await api.createListing({
        title,
        description,
        category,
        type,
        price,
        stock: Number(stock),
      });
      setTitle('');
      setDescription('');
      setPrice('');
      setStock('1');
      await mutate();
    } catch {
      setFormError("La création de l'annonce a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCash = async (order: Order) => {
    setBusyOrderId(order.id);
    try {
      // Confirmer l'encaissement clôture aussi la commande côté serveur.
      await api.confirmCash(order.id);
      await mutate();
    } finally {
      setBusyOrderId(null);
    }
  };

  if (!ready || !isArtisan || isLoading) return <p className="text-stone-600">Chargement…</p>;

  const listings = data?.listings ?? [];
  const orders = data?.orders ?? [];

  const revenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.totalPrice), 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Mon atelier</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Annonces en ligne', value: listings.length },
            { label: 'Commandes reçues', value: orders.length },
            { label: 'Encaissé', value: formatXAF(revenue) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Commandes à traiter</h2>
        {orders.length === 0 ? (
          <p className="mt-3 rounded-lg border border-stone-200 bg-white p-6 text-stone-600">
            Aucune commande pour le moment.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {orders.map((order) => (
              <li
                key={order.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4"
              >
                <div>
                  <p className="font-medium">{order.listing?.title ?? 'Annonce supprimée'}</p>
                  <p className="text-sm text-stone-600">
                    {order.quantity} × · Acheteur : {order.buyer?.name ?? '—'} ·{' '}
                    {new Date(order.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                  <Link
                    href={`/messages?to=${order.buyerId}`}
                    className="mt-1 inline-block text-sm text-amber-700 underline"
                  >
                    Contacter l&apos;acheteur
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatXAF(order.totalPrice)}</span>
                  <StatusBadge status={order.status} />
                  {order.paymentMethod === 'cash' &&
                    order.status !== 'completed' &&
                    order.status !== 'cancelled' && (
                    <button
                      onClick={() => handleConfirmCash(order)}
                      disabled={busyOrderId === order.id}
                      className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                    >
                      {busyOrderId === order.id ? '…' : 'Espèces reçues'}
                    </button>
                  )}
                  {order.paymentMethod === 'orange_money' && order.status === 'pending' && (
                    <span className="text-sm text-orange-700">Orange Money en attente</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Nouvelle annonce</h2>
          <form
            onSubmit={handleCreate}
            className="mt-3 space-y-4 rounded-lg border border-stone-200 bg-white p-6"
          >
            <div>
              <label htmlFor="title" className="block text-sm font-medium">
                Titre
              </label>
              <input
                id="title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="category" className="block text-sm font-medium">
                  Catégorie
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setType(
                      CATEGORIES.find((c) => c.value === e.target.value)?.type ?? 'product',
                    );
                  }}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
                >
                  <optgroup label="Métiers d'art">
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Services">
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div>
                <span className="block text-sm font-medium">Type</span>
                <p className="mt-1 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-stone-600">
                  {type === 'service' ? 'Service' : 'Produit'}
                </p>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium">
                  Prix (FCFA)
                </label>
                <input
                  id="price"
                  type="number"
                  step="500"
                  min="0"
                  required
                  placeholder="15000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label htmlFor="stock" className="block text-sm font-medium">
                  Stock
                </label>
                <input
                  id="stock"
                  type="number"
                  min="1"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {saving ? 'Publication…' : "Publier l'annonce"}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold">Mes annonces</h2>
          {listings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-stone-200 bg-white p-6 text-stone-600">
              Vous n&apos;avez pas encore publié d&apos;annonce.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-white p-4"
                >
                  <div>
                    <p className="font-medium">{listing.title}</p>
                    <p className="text-sm text-stone-600">
                      {categoryLabel(listing.category)} · stock {listing.stock}
                    </p>
                  </div>
                  <span className="font-semibold">{formatXAF(listing.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

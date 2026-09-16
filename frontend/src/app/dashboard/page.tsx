'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useLanguage } from '@/lib/language-context';
import { CATEGORIES, PRODUCT_CATEGORIES, SERVICE_CATEGORIES, categoryLabel } from '@/lib/categories';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import type { Listing, ListingType, Order } from '@/lib/types';
import { resolveMediaUrl } from '@/lib/media';

import type { Shop } from '@/lib/types';

export default function DashboardPage() {
  const { user, ready } = useAuth();
  const { t } = useLanguage();
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

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('vannerie');
  const [type, setType] = useState<ListingType>('product');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('1');
  const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<('cash' | 'momo' | 'orange_money')[]>(['cash', 'momo', 'orange_money']);
  const [deliveryMethods, setDeliveryMethods] = useState<('workshop' | 'home' | 'carrier')[]>(['workshop', 'home', 'carrier']);
  const [imageUrl, setImageUrl] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !isArtisan) router.push('/');
  }, [ready, isArtisan, router]);

  // Charger mes boutiques pour la sélection
  useEffect(() => {
    if (user?.role === 'artisan') {
      api.myShops().then(setShops);
    }
  }, [user]);

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
        acceptedPaymentMethods,
        deliveryMethods,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
        shopId: shopId || undefined,
      });
      setTitle('');
      setDescription('');
      setPrice('');
      setStock('1');
      setImageUrl('');
      setImageUrls([]);
      setShopId('');
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "La création de l'annonce a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (listing: Listing) => {
    setEditingId(listing.id);
    setTitle(listing.title);
    setDescription(listing.description);
    setCategory(listing.category);
    setType(listing.type);
    setPrice(String(listing.price));
    setStock(String(listing.stock));
    setAcceptedPaymentMethods(listing.acceptedPaymentMethods?.length ? listing.acceptedPaymentMethods : ['cash', 'momo', 'orange_money']);
    setDeliveryMethods(listing.deliveryMethods?.length ? listing.deliveryMethods : ['workshop', 'home', 'carrier']);
    setImageUrl(listing.imageUrl ?? '');
    setImageUrls(listing.imageUrls?.length ? listing.imageUrls : listing.imageUrl ? [listing.imageUrl] : []);
    setShopId(listing.shopId || '');
    setFormError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setCategory('vannerie');
    setType('product');
    setPrice('');
    setStock('1');
    setAcceptedPaymentMethods(['cash', 'momo', 'orange_money']);
    setDeliveryMethods(['workshop', 'home', 'carrier']);
    setImageUrl('');
    setImageUrls([]);
    setFormError('');
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (files.length > 5) {
      setFormError('Sélectionnez au maximum 5 images.');
      e.target.value = '';
      return;
    }
    setUploadingImage(true);
    setFormError('');
    try {
      const { imageUrls: uploaded } = await api.uploadListingImages(files);
      setImageUrls(uploaded);
      setImageUrl(uploaded[0] ?? '');
    } catch {
      setFormError("Le téléversement des images a échoué (5 Mo max par image, JPEG/PNG/WebP/GIF).");
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    setFormError('');
    try {
      await api.updateListing(editingId, {
        title,
        description,
        category,
        type,
        price,
        stock: Number(stock),
        acceptedPaymentMethods,
        deliveryMethods,
        imageUrl: imageUrls[0] ?? null,
        imageUrls,
        shopId: shopId || undefined,
      });
      cancelEditing();
      await mutate();
    } catch {
      setFormError("La modification de l'annonce a échoué.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleListing = async (listing: Listing) => {
    setFormError('');
    try {
      if (listing.status === 'active') {
        await api.deleteListing(listing.id);
      } else {
        await api.updateListing(listing.id, { status: 'active' });
      }
      await mutate();
    } catch {
      setFormError("Le statut de l'annonce n'a pas pu être modifié.");
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

  const runEscrow = async (orderId: string, action: () => Promise<unknown>) => {
    setBusyOrderId(orderId);
    try {
      await action();
      await mutate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "L'action a échoué.");
    } finally {
      setBusyOrderId(null);
    }
  };

  /** Vérification transporteur : un tiers (ni acheteur, ni vendeur) confirme le produit. */
  const runCarrierVerify = async (order: Order) => {
    if (!user || user.id === order.buyerId || user.id === order.sellerId) return;
    await runEscrow(order.id, () => api.carrierVerify(order.id, true, true));
  };

  if (!ready || !isArtisan || isLoading) return <p className="text-stone-600">{t('action_loading')}</p>;

  const listings = data?.listings ?? [];
  const orders = data?.orders ?? [];

  const paymentCard = (
    <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Abonnement</p>
          <h3 className="mt-2 text-xl font-semibold text-stone-900">Premium Artisan</h3>
          <p className="mt-1 text-sm text-stone-600">5 000 FCFA / mois • accès premium • paiements automatiques</p>
        </div>
        <Link href="/payment?type=subscription" className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 transition">
          Payer avec MoMo
        </Link>
      </div>
    </div>
  );

  const revenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.totalPrice), 0);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">{t('dashboard_title')}</h1>
        <p className="mt-1 text-sm text-stone-600">{t('dashboard_subtitle')}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { label: t('dashboard_my_listings'), value: listings.length },
            { label: t('dashboard_orders_received'), value: orders.length },
            { label: 'Encaissé / Revenue', value: formatXAF(revenue) },
          ].map((stat) => (
            <div key={stat.label} className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="text-sm text-stone-600">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold">{t('dashboard_orders_received')}</h2>
        {orders.length === 0 ? (
          <p className="mt-3 rounded-lg border border-stone-200 bg-white p-6 text-stone-600">
            {t('dashboard_no_orders')}
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
                  {order.paymentMethod === 'orange_money' && user && (
                    <div className="mt-2 flex w-full flex-wrap gap-2">
                      {user.id === order.sellerId && !order.sellerConfirmedAvailability && (
                        <>
                          <button
                            onClick={() => runEscrow(order.id, () => api.confirmAvailability(order.id))}
                            disabled={busyOrderId === order.id}
                            className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
                          >
                            Produit disponible
                          </button>
                          <button
                            onClick={() => runEscrow(order.id, () => api.rejectAvailability(order.id))}
                            disabled={busyOrderId === order.id}
                            className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                          >
                            Indisponible (rembourser)
                          </button>
                        </>
                      )}
                      {user.id !== order.sellerId && user.id !== order.buyerId &&
                        order.sellerConfirmedAvailability && !order.carrierVerified && (
                        <button
                          onClick={() => runCarrierVerify(order)}
                          disabled={busyOrderId === order.id}
                          className="rounded-md bg-stone-800 px-3 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-60"
                        >
                          Transporteur : récupéré & conforme
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              {editingId ? t('dashboard_edit_listing') : t('dashboard_new_listing')}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="text-sm text-stone-600 underline"
              >
                {t('action_cancel')}
              </button>
            )}
          </div>
          <form
            onSubmit={editingId ? handleSaveListing : handleCreate}
            className="mt-3 space-y-4 rounded-lg border border-stone-200 bg-white p-6"
          >
            <div>
              <label htmlFor="shop" className="block text-sm font-medium">
                {t('dashboard_shop_select')}
              </label>
              <select
                id="shop"
                value={shopId}
                onChange={e => setShopId(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
              >
                <option value="">— Sélectionner une boutique / Select shop —</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name} ({shop.status === 'active' ? 'Active' : shop.status === 'pending' ? 'En attente / Pending' : 'Inactive'})
                  </option>
                ))}
              </select>
            </div>
            {shops.length > 0 && shops.every(s => s.status !== 'active') && (
              <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                ⚠️ Votre boutique <strong>« {shops[0].name} »</strong> est actuellement <strong>en attente de validation</strong> par un administrateur.
              </p>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium">
                {t('dashboard_listing_title')}
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
                {t('dashboard_listing_description')}
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
                  {t('dashboard_listing_category')}
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
                  <optgroup label={t('filter_crafts')}>
                    {PRODUCT_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {categoryLabel(c.value)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label={t('filter_services')}>
                    {SERVICE_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {categoryLabel(c.value)}
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
                  {t('dashboard_listing_price')}
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
                  {t('dashboard_listing_stock')}
                </label>
                <input
                  id="stock"
                  type="number"
                  min="0"
                  required
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
                />
              </div>
            </div>

            <fieldset className="mt-5 rounded-md border border-stone-200 p-4">
              <legend className="px-1 text-sm font-medium">Modes de paiement acceptés</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {([
                  ['cash', 'Espèces'],
                  ['momo', 'MoMo'],
                  ['orange_money', 'Orange Money'],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-md border border-stone-200 p-3 text-sm">
                    <input type="checkbox" checked={acceptedPaymentMethods.includes(value)} onChange={() => setAcceptedPaymentMethods((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mt-4 rounded-md border border-stone-200 p-4">
              <legend className="px-1 text-sm font-medium">Types de livraison proposés</legend>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {([
                  ['workshop', "Retrait à l'atelier"],
                  ['home', 'Livraison à domicile'],
                  ['carrier', 'Transporteur'],
                ] as const).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2 rounded-md border border-stone-200 p-3 text-sm">
                    <input type="checkbox" checked={deliveryMethods.includes(value)} onChange={() => setDeliveryMethods((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="images" className="block text-sm font-medium">
                Photos (jusqu&apos;à 5)
              </label>
              <input
                id="images"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (!files.length) return;
                  setUploadingImage(true);
                  try {
                    const { imageUrls: uploaded } = await api.uploadListingImages(files);
                    setImageUrls(uploaded);
                    setImageUrl(uploaded[0] ?? '');
                  } catch {
                    setFormError("Le téléversement d'une ou plusieurs images a échoué.");
                  } finally {
                    setUploadingImage(false);
                  }
                }}
                className="mt-1 w-full rounded-md border border-amber-300 bg-amber-50 p-2 text-sm text-stone-700 file:mr-3 file:rounded-md file:border-0 file:bg-amber-700 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-amber-800"
              />
              {uploadingImage && (
                <p className="mt-1 text-xs text-stone-500">{t('action_loading')}</p>
              )}
              {imageUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {imageUrls.map((url, i) => (
                    <img key={i} src={resolveMediaUrl(url)} alt={`Aperçu ${i + 1}`} className="h-16 w-16 object-cover rounded border border-stone-200" />
                  ))}
                </div>
              )}
            </div>

            {formError && <p className="text-sm text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-md bg-amber-700 py-2 font-medium text-white hover:bg-amber-800 disabled:opacity-60"
            >
              {saving ? t('action_loading') : editingId ? t('action_save') : t('dashboard_publish_button')}
            </button>
          </form>
        </div>

        <div>
          <h2 className="text-lg font-semibold">{t('dashboard_my_listings')}</h2>
          {listings.length === 0 ? (
            <p className="mt-3 rounded-lg border border-stone-200 bg-white p-6 text-stone-600">
              {t('dashboard_no_listings')}
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {listings.map((listing) => (
                <li
                  key={listing.id}
                  className={`flex items-center justify-between gap-4 rounded-lg border p-4 transition ${
                    listing.status === 'inactive'
                      ? 'border-stone-300 bg-stone-100 text-stone-500 grayscale'
                      : 'border-stone-200 bg-white'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{listing.title}</p>
                      {listing.status === 'inactive' && (
                        <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-600">
                          Désactivée
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-600">
                      {categoryLabel(listing.category)} · stock {listing.stock}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatXAF(listing.price)}</span>
                    <button
                      type="button"
                      onClick={() => startEditing(listing)}
                      className="rounded-md border border-amber-700 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-50"
                    >
                      {t('action_edit')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleListing(listing)}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        listing.status === 'inactive'
                          ? 'border-green-200 text-green-700 hover:bg-green-50'
                          : 'border-red-200 text-red-700 hover:bg-red-50'
                      }`}
                    >
                      {listing.status === 'inactive' ? 'Réactiver' : 'Désactiver'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

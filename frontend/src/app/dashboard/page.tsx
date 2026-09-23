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
      const [listings, [orders], requestStats, serviceOrders] = await Promise.all([
        api.sellerListings(sellerId),
        api.sellerOrders(sellerId),
        api.getCustomerRequestStats().catch(() => ({ requestsReceived: 0, responsesSent: 0, openRequests: 0, averageResponseMinutes: 0 })),
        api.getArtisanServiceOrders().catch(() => []),
      ]);
      return { listings, orders, requestStats, serviceOrders };
    },
  );

  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const { data: planStatus } = useSWR(isArtisan ? ['plan-status', user.id] : null, () => api.getPlanStatus());

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopMetrics, setShopMetrics] = useState<Record<string, { views: number; whatsappContactClicks: number; whatsappShareClicks: number }>>({});
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
  const [aiImageUrls, setAiImageUrls] = useState<string[]>([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('studio');
  const [generatingAiImage, setGeneratingAiImage] = useState(false);
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
      Promise.all([
        api.myShops(),
        api.myShopMetrics(),
      ]).then(([myShops, metricsMap]) => {
        setShops(myShops);
        setShopMetrics(metricsMap);
      }).catch(() => {
        api.myShops().then((myShops) => setShops(myShops));
      });
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
        aiImageUrls,
        shopId: shopId || undefined,
      });
      setTitle('');
      setDescription('');
      setPrice('');
      setStock('1');
      setImageUrl('');
      setImageUrls([]);
      setAiImageUrls([]);
      setAiPrompt('');
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
    setAiImageUrls(listing.aiImageUrls ?? []);
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
    setAiImageUrls([]);
    setAiPrompt('');
    setFormError('');
  };

  const generateAiImage = async () => {
    if (!aiPrompt.trim()) return;
    setGeneratingAiImage(true);
    setFormError('');
    try {
      const result = await api.assistantGenerateImage({ prompt: aiPrompt, style: aiStyle, language: 'fr' });
      setAiImageUrls((current) => [...current, result.imageUrl].slice(-3));
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'La génération de l’image IA a échoué.');
    } finally {
      setGeneratingAiImage(false);
    }
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
        aiImageUrls,
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

  const isSponsored = (listing: Listing) =>
    Boolean(listing.sponsoredUntil && new Date(listing.sponsoredUntil) > new Date());

  const handleSponsor = async (listing: Listing) => {
    setFormError('');
    try {
      if (isSponsored(listing)) {
        await api.stopSponsoringListing(listing.id);
      } else {
        await api.sponsorListing(listing.id);
      }
      await mutate();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "La mise en avant n'a pas pu être modifiée.");
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

  const handlePrintCatalogue = () => {
    const catalogShops = shops.length ? shops : [{ id: 'demo', name: 'Ma boutique', description: 'Catalogue artisanal', city: user?.location ?? 'Cameroun' }];
    const catalogRows = listings.slice(0, 12).map((listing) => `
      <div style="border:1px solid #e7e5e4;border-radius:12px;padding:12px;page-break-inside:avoid;">
        <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;">${categoryLabel(listing.category)}</div>
        <div style="font-size:18px;font-weight:700;margin-top:4px;">${listing.title}</div>
        <div style="font-size:14px;color:#44403c;margin-top:8px;">${listing.description}</div>
        <div style="font-size:18px;font-weight:700;margin-top:10px;">${formatXAF(Number(listing.price))}</div>
      </div>
    `).join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) return;

    printWindow.document.write(`<!doctype html>
      <html>
        <head>
          <title>Catalogue ArtisanConnect</title>
          <style>
            body { font-family: Arial, sans-serif; background: #fff; color: #1c1917; margin: 24px; }
            h1 { margin-bottom: 6px; }
            .subtitle { color: #57534e; margin-bottom: 20px; }
            .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
            .shop { margin-bottom: 28px; padding-bottom: 14px; border-bottom: 2px solid #f5f5f4; }
            .pill { display: inline-block; background: #fef3c7; color: #92400e; padding: 6px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Catalogue ArtisanConnect</h1>
          <div class="subtitle">Boutiques et annonces à partager en atelier ou en événement.</div>
          ${catalogShops.map((shop) => `
            <section class="shop">
              <div class="pill">${shop.name}</div>
              <p style="margin:10px 0 0;color:#57534e;">${shop.description || 'Boutique artisanale locale'}</p>
              ${shop.city ? `<p style="margin:8px 0 0;color:#57534e;">Ville : ${shop.city}</p>` : ''}
              <div class="grid" style="margin-top:16px;">${catalogRows || '<div style="color:#57534e;">Aucune annonce pour le moment.</div>'}</div>
            </section>
          `).join('')}
        </body>
      </html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
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

  const listings = Array.isArray(data?.listings) ? data.listings : [];
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const requestStats: { requestsReceived: number; responsesSent: number; openRequests: number; averageResponseMinutes: number } = data?.requestStats ?? { requestsReceived: 0, responsesSent: 0, openRequests: 0, averageResponseMinutes: 0 };
  const serviceOrders = Array.isArray(data?.serviceOrders) ? data.serviceOrders : [];
  const quotesSent = serviceOrders.filter((order: { status?: string }) => ['quote_pending', 'accepted', 'in_progress', 'delivered', 'completed', 'disputed'].includes(order.status ?? '')).length;
  const responseRate = requestStats.requestsReceived > 0 ? Math.round((requestStats.responsesSent / requestStats.requestsReceived) * 100) : 0;
  const averageResponseLabel = requestStats.averageResponseMinutes >= 60
    ? `${Math.round(requestStats.averageResponseMinutes / 60)} h`
    : `${requestStats.averageResponseMinutes} min`;
  const planEndDate = planStatus?.endDate ? new Date(planStatus.endDate) : null;
  const daysUntilPlanEnd = planEndDate ? Math.ceil((planEndDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)) : null;
  const planNeedsRenewal = Boolean(planStatus?.planSlug && planStatus.planSlug !== 'starter' && planEndDate);
  const planRenewalHref = planStatus?.planSlug ? `/payment?type=subscription&plan=${encodeURIComponent(planStatus.planSlug)}` : '/payment?type=subscription';
  const totalShopMetrics = shops.reduce((total, shop) => {
    const metrics = shopMetrics[shop.id] ?? { views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 };
    return {
      views: total.views + metrics.views,
      whatsappContactClicks: total.whatsappContactClicks + metrics.whatsappContactClicks,
      whatsappShareClicks: total.whatsappShareClicks + metrics.whatsappShareClicks,
    };
  }, { views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 });

  const planCard = (
    <div className={`rounded-2xl border p-5 shadow-sm ${planStatus?.premium ? 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50' : 'border-stone-200 bg-white'}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Votre offre</p>
          <h3 className="mt-2 text-xl font-semibold text-stone-900">
            {planStatus?.premium ? `★ ${planStatus.planName}` : 'Offre gratuite'}
          </h3>
          {planStatus?.premium ? (
            <p className="mt-1 text-sm text-stone-600">
              Annonces illimitées, mise en avant dans les résultats et priorité sur les demandes
              {planEndDate ? ` · valable jusqu’au ${planEndDate.toLocaleDateString('fr-FR')}` : ''}.
            </p>
          ) : (
            <p className="mt-1 text-sm text-stone-600">
              {planNeedsRenewal && daysUntilPlanEnd !== null && daysUntilPlanEnd < 0
                ? 'Votre abonnement est arrivé à expiration. Renouvelez-le pour retrouver vos avantages Premium.'
                : `${listings.length} / ${planStatus?.listingLimit ?? 5} annonces actives · passez à Premium pour publier sans limite, apparaître en priorité et recevoir plus de demandes.`}
            </p>
          )}
          {planStatus?.premium && daysUntilPlanEnd !== null && daysUntilPlanEnd <= 7 ? (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-900">
              Votre abonnement expire {daysUntilPlanEnd <= 0 ? 'aujourd’hui' : `dans ${daysUntilPlanEnd} jour${daysUntilPlanEnd > 1 ? 's' : ''}`}.
            </p>
          ) : null}
        </div>
        {planNeedsRenewal ? (
          <Link href={planRenewalHref} className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800">
            Renouveler mon abonnement
          </Link>
        ) : !planStatus?.premium ? (
          <Link href="/payment?type=subscription" className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-800">
            Passer à Premium
          </Link>
        ) : null}
      </div>
    </div>
  );

  const revenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + Number(o.totalPrice), 0);

  return (
    <div className="space-y-10">
      <div>
        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">{t('dashboard_title')}</p>
              <h1 className="mt-2 text-2xl font-semibold text-stone-950">{t('dashboard_welcome')}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-700">{t('dashboard_welcome_desc')}</p>
            </div>
            <Link href="#new-listing" className="inline-flex w-fit items-center rounded-md bg-amber-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-800">
              {t('dashboard_new_listing')}
            </Link>
          </div>
          <div className="border-t border-amber-200 bg-white/70 px-6 py-3 text-sm text-stone-700">
            <span className="font-semibold text-stone-900">{t('dashboard_next_step')} :</span> {t('dashboard_next_step_desc')}
          </div>
        </div>
        <p className="mt-4 text-sm text-stone-600">{t('dashboard_subtitle')}</p>
        <div className="mt-4">{planCard}</div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: t('dashboard_my_listings'), value: listings.length },
            { label: t('dashboard_orders_received'), value: orders.length },
            { label: 'Encaissé / Revenue', value: formatXAF(revenue) },
            { label: 'Demandes reçues', value: requestStats.requestsReceived },
            { label: 'Réponses envoyées', value: requestStats.responsesSent },
            { label: 'Devis envoyés', value: quotesSent },
            { label: 'Taux de réponse', value: `${responseRate}%` },
            { label: 'Délai moyen de réponse', value: averageResponseLabel },
            { label: 'Vues boutique', value: totalShopMetrics.views },
            { label: 'Contacts WhatsApp', value: totalShopMetrics.whatsappContactClicks },
            { label: 'Partages boutique', value: totalShopMetrics.whatsappShareClicks },
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
                  {(order.paymentMethod === 'orange_money' || order.paymentMethod === 'momo') && user && (
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

      {shops.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">{t('dashboard_qr_badge')}</p>
              <h2 className="mt-1 text-xl font-semibold text-stone-950">{t('dashboard_qr_title')}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {t('dashboard_qr_description')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrintCatalogue}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
              >
                {t('dashboard_qr_catalogue')}
              </button>
              <Link href="/shop/create" className="text-sm font-medium text-amber-700 hover:text-amber-800">
                {t('dashboard_qr_create_shop')}
              </Link>
            </div>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => {
              const metrics = shopMetrics[shop.id] ?? { views: 0, whatsappContactClicks: 0, whatsappShareClicks: 0 };
              const shopUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://artisanconnectcm.info'}/shop/${shop.id}`;
              const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(shopUrl)}`;
              return (
                <article key={shop.id} className="flex flex-col items-center rounded-md border border-stone-200 p-4 text-center">
                  <h3 className="font-semibold text-stone-900">{shop.name}</h3>
                  <div className="mt-3 grid w-full grid-cols-3 gap-2 text-center text-xs text-stone-600">
                    <div className="rounded bg-stone-100 p-2"><div className="text-[10px] uppercase tracking-wide text-stone-500">{t('dashboard_qr_views')}</div><div className="mt-1 font-semibold text-stone-900">{metrics.views}</div></div>
                    <div className="rounded bg-stone-100 p-2"><div className="text-[10px] uppercase tracking-wide text-stone-500">WhatsApp</div><div className="mt-1 font-semibold text-stone-900">{metrics.whatsappContactClicks}</div></div>
                    <div className="rounded bg-stone-100 p-2"><div className="text-[10px] uppercase tracking-wide text-stone-500">{t('dashboard_qr_shares')}</div><div className="mt-1 font-semibold text-stone-900">{metrics.whatsappShareClicks}</div></div>
                  </div>
                  <img
                    src={qrCodeUrl}
                    alt={t('dashboard_qr_alt', { name: shop.name })}
                    width={200}
                    height={200}
                    className="mt-3 h-48 w-48"
                  />
                  <p className="mt-2 break-all text-xs text-stone-500">{shopUrl}</p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    <a href={shopUrl} target="_blank" rel="noreferrer" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50">
                      {t('dashboard_qr_view_shop')}
                    </a>
                    <a href={qrCodeUrl} target="_blank" rel="noreferrer" className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800">
                      {t('dashboard_qr_open')}
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section id="new-listing" className="grid gap-8 lg:grid-cols-2">
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

            <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Image IA — mise en scène / inspiration</p>
              <p className="mt-1 text-xs text-amber-800">Cette image ne constitue pas une preuve de réalisation. Ajoutez une photo réelle du produit avant la publication finale.</p>
              <textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} rows={3} placeholder="Décrivez le produit que vous pouvez réellement fabriquer..." className="field mt-3 w-full bg-white" />
              <div className="mt-2 flex flex-wrap gap-2">
                <select value={aiStyle} onChange={(event) => setAiStyle(event.target.value)} className="field bg-white">
                  <option value="studio">Studio</option>
                  <option value="catalogue">Catalogue</option>
                  <option value="lifestyle">Mise en scène lifestyle</option>
                  <option value="marketing">Marketing</option>
                  <option value="detail">Détail / texture</option>
                </select>
                <button type="button" disabled={generatingAiImage || aiImageUrls.length >= 3 || aiPrompt.trim().length < 20} onClick={() => void generateAiImage()} className="rounded-md bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-60">
                  {generatingAiImage ? 'Génération...' : 'Générer une image IA'}
                </button>
              </div>
              {aiImageUrls.length > 0 && <div className="mt-3 grid grid-cols-3 gap-2">{aiImageUrls.map((url, index) => <div key={`${url}-${index}`} className="relative"><img src={resolveMediaUrl(url)} alt={`Image IA ${index + 1}`} className="aspect-square w-full rounded border border-amber-300 object-cover" /><button type="button" onClick={() => setAiImageUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="absolute right-1 top-1 rounded bg-stone-900/80 px-2 py-1 text-xs text-white" aria-label={`Supprimer l’image IA ${index + 1}`}>×</button></div>)}</div>}
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
                      {isSponsored(listing) && (
                        <span className="rounded-full bg-stone-900 px-2 py-0.5 text-xs font-medium text-white">
                          Sponsorisée jusqu&apos;au {new Date(listing.sponsoredUntil!).toLocaleDateString('fr-FR')}
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
                    {listing.status === 'active' ? (
                      <button
                        type="button"
                        onClick={() => void handleSponsor(listing)}
                        disabled={!planStatus?.premium && !isSponsored(listing)}
                        title={planStatus?.premium ? undefined : 'Réservé aux artisans Premium'}
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSponsored(listing) ? 'Retirer la mise en avant' : 'Mettre en avant'}
                      </button>
                    ) : null}
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

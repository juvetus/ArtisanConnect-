'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import type { AdminStats, Listing, Order, Shop, User } from '@/lib/types';

interface ServiceDashboardStats {
  stats: {
    pendingValidationCount: number;
    validationRequestedCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgValidationTimeHours: number;
  };
}

export default function AdminPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<'overview' | 'users' | 'listings' | 'shops'>('overview');
  const [actionError, setActionError] = useState('');
  const [usersPage, setUsersPage] = useState(0);
  const [listingsPage, setListingsPage] = useState(0);
  const [shopsPage, setShopsPage] = useState(0);
  const [recentOrdersPage, setRecentOrdersPage] = useState(0);
  const PAGE_SIZE = 10;

  const { data, isLoading, mutate } = useSWR(
    user?.role === 'admin' ? 'admin-console' : null,
    async () => {
      const [overview, users, listings, shops, serviceDashboard] = await Promise.all([
        api.adminOverview(),
        api.adminUsers(),
        api.adminListings(),
        api.adminShops(),
        api.getServiceDashboardStats(),
      ]);
      return { overview, users, listings, shops, serviceDashboard: serviceDashboard as ServiceDashboardStats };
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

  const runAdminAction = async (action: () => Promise<unknown>) => {
    try {
      setActionError('');
      await action();
      await mutate();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Action impossible');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-amber-700">Pilotage</p>
          <h1 className="text-3xl font-semibold">Administration</h1>
          <p className="mt-1 text-stone-600">Vue opérationnelle de la marketplace camerounaise.</p>
        </div>
        {view === 'overview' && <button onClick={() => void api.downloadAdminReportPdf()} className="rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Exporter le rapport PDF</button>}
        <div className="flex rounded-lg border border-stone-200 bg-white p-1 text-sm">
          {[
            ['overview', 'Synthèse'],
            ['shops', 'Boutiques'],
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
          ['Volume terminé', formatXAF(stats.revenue), `Commission (10 %) : ${formatXAF(stats.platformFees)}${stats.servicePlatformFees ? ` · Services : ${formatXAF(stats.servicePlatformFees)}` : ''}`],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-600">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-stone-500">{detail}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Femmes Artisanes', `${stats.womenArtisans ?? 0} (${stats.womenPercentage ?? 0}%)`, 'Entrepreneuriat féminin (BuyFromWomen)'],
          ['Coopératives & GIC', `${stats.cooperativeArtisans ?? 0} (${stats.cooperativePercentage ?? 0}%)`, 'Groupements et structures collectives'],
          ['Institutions partenaires', stats.institutions ?? 0, 'Acteurs institutionnels'],
          ['Dispositifs & Candidatures', `${stats.programs ?? 0} prog. · ${stats.resources ?? 0} ress.`, `${stats.programApplications ?? 0} candidature(s) enregistrée(s)`],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-lg border border-stone-200 bg-white p-5">
            <p className="text-sm text-stone-600">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-stone-500">{detail}</p>
          </div>
        ))}
      </section>

      {actionError && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      {view === 'shops' && (
        <ShopsAdmin
          shops={data.shops}
          page={shopsPage}
          pageSize={PAGE_SIZE}
          onPageChange={setShopsPage}
          onReview={async (id, approve) => { await api.adminReviewShop(id, approve); await mutate(); }}
          onAction={runAdminAction}
        />
      )}

      {view === 'overview' && (
        <section className="rounded-lg border border-stone-200 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Synthèse de l’activité</h2>
              <p className="mt-1 text-sm text-stone-600">Comparaison des principaux volumes de la plateforme.</p>
            </div>
            <span className="text-xs text-stone-500">Données actuelles</span>
          </div>
          <AdminColumnChart
            values={[
              { label: 'Utilisateurs', value: stats.users, color: 'bg-stone-700' },
              { label: 'Annonces', value: stats.listings, color: 'bg-amber-600' },
              { label: 'Commandes', value: stats.orders, color: 'bg-blue-600' },
              { label: 'Services approuvés', value: data.serviceDashboard.stats.approvedCount, color: 'bg-green-600' },
              { label: 'En attente', value: data.serviceDashboard.stats.pendingValidationCount, color: 'bg-orange-500' },
            ]}
          />
        </section>
      )}

      {view === 'overview' && (
        <section className="grid gap-6 lg:grid-cols-2">
          <AdminUsersPieChart stats={stats} />
          <AdminListingsBarChart listings={data.listings} />
        </section>
      )}

      {view === 'overview' && (
        <RecentOrders
          orders={recentOrders}
          page={recentOrdersPage}
          pageSize={5}
          onPageChange={setRecentOrdersPage}
        />
      )}

      {view === 'users' && (
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-5">
            <h2 className="font-semibold">Utilisateurs ({data.users.length})</h2>
            <p className="mt-1 text-sm text-stone-600">Les mots de passe ne sont jamais exposés.</p>
          </div>
          <div className="divide-y divide-stone-100">
            {data.users.slice(usersPage * PAGE_SIZE, (usersPage + 1) * PAGE_SIZE).map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-stone-600">{member.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs capitalize">{member.role}</span>
                  {member.gender && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700 capitalize">
                      {member.gender === 'female' ? 'Femme' : member.gender === 'cooperative' ? 'Coopérative' : member.gender}
                    </span>
                  )}
                  {member.isActive === false && <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">Désactivé</span>}
                  {member.role !== 'admin' && (
                    <>
                      <button onClick={() => changeRole(member)} className="text-sm text-amber-700 underline">
                        Passer {member.role === 'artisan' ? 'client' : 'artisan'}
                      </button>
                      <button
                        onClick={() => void runAdminAction(() => api.adminSetUserStatus(member.id, member.isActive === false))}
                        className="text-sm text-orange-700 underline"
                      >
                        {member.isActive === false ? 'Réactiver' : 'Désactiver'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer définitivement ${member.name} ?`)) void runAdminAction(() => api.adminDeleteUser(member.id));
                        }}
                        className="text-sm text-red-700 underline"
                      >
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          {data.users.length > PAGE_SIZE && (
            <div className="p-4 border-t border-stone-100">
              <Pagination
                page={usersPage}
                hasPrevious={usersPage > 0}
                hasNext={(usersPage + 1) * PAGE_SIZE < data.users.length}
                onPrevious={() => setUsersPage((p) => Math.max(0, p - 1))}
                onNext={() => setUsersPage((p) => p + 1)}
              />
            </div>
          )}
        </section>
      )}

      {view === 'listings' && (
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="border-b border-stone-200 p-5">
            <h2 className="font-semibold">Modération des annonces ({data.listings.length})</h2>
            <p className="mt-1 text-sm text-stone-600">Désactivez une annonce qui ne respecte pas les règles.</p>
          </div>
          <div className="divide-y divide-stone-100">
            {data.listings.slice(listingsPage * PAGE_SIZE, (listingsPage + 1) * PAGE_SIZE).map((listing) => (
              <div
                key={listing.id}
                className={`flex flex-wrap items-center justify-between gap-3 p-4 ${
                  listing.status === 'inactive' ? 'bg-stone-100 text-stone-500 grayscale' : ''
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
                    {listing.seller?.name} · {formatXAF(listing.price)} · {listing.category}
                  </p>
                </div>
                <div className="flex gap-2">
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
                  <button
                    onClick={() => {
                      if (confirm(`Supprimer définitivement l'annonce « ${listing.title} » ?`)) void runAdminAction(() => api.adminDeleteListing(listing.id));
                    }}
                    className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
          {data.listings.length > PAGE_SIZE && (
            <div className="p-4 border-t border-stone-100">
              <Pagination
                page={listingsPage}
                hasPrevious={listingsPage > 0}
                hasNext={(listingsPage + 1) * PAGE_SIZE < data.listings.length}
                onPrevious={() => setListingsPage((p) => Math.max(0, p - 1))}
                onNext={() => setListingsPage((p) => p + 1)}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function AdminColumnChart({ values }: { values: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  return (
    <div className="mt-6 flex h-64 items-end justify-around gap-3 border-b border-l border-stone-200 px-4 pb-0 pt-6 sm:gap-8" aria-label="Graphique en colonnes de l’activité">
      {values.map((item) => {
        const height = item.value > 0 ? Math.max((item.value / max) * 100, 8) : 2;
        return (
          <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <span className="text-sm font-semibold text-stone-800">{item.value}</span>
            <div className={`w-full max-w-16 rounded-t-md ${item.color} transition-all`} style={{ height: `${height}%` }} role="img" aria-label={`${item.label}: ${item.value}`} />
            <span className="max-w-24 text-center text-xs leading-tight text-stone-600">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function AdminUsersPieChart({ stats }: { stats: Pick<AdminStats, 'users' | 'artisans' | 'clients'> }) {
  const others = Math.max(stats.users - stats.artisans - stats.clients, 0);
  const total = Math.max(stats.users, 1);
  const artisanPercent = (stats.artisans / total) * 100;
  const clientPercent = (stats.clients / total) * 100;
  const pie = `conic-gradient(#b45309 0 ${artisanPercent}%, #2563eb ${artisanPercent}% ${artisanPercent + clientPercent}%, #78716c ${artisanPercent + clientPercent}% 100%)`;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-stone-900">Répartition des utilisateurs</h2>
      <p className="mt-1 text-sm text-stone-600">Artisans, clients et autres profils.</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
        <div className="h-40 w-40 rounded-full" style={{ background: pie }} role="img" aria-label="Répartition des utilisateurs" />
        <div className="space-y-3 text-sm">
          <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-amber-700" />Artisans : <strong>{stats.artisans}</strong></div>
          <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-blue-600" />Clients : <strong>{stats.clients}</strong></div>
          <div><span className="mr-2 inline-block h-3 w-3 rounded-full bg-stone-500" />Autres : <strong>{others}</strong></div>
        </div>
      </div>
    </section>
  );
}

function AdminListingsBarChart({ listings }: { listings: Listing[] }) {
  const active = listings.filter((listing) => listing.status === 'active').length;
  const inactive = listings.filter((listing) => listing.status === 'inactive').length;
  const max = Math.max(active, inactive, 1);
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-stone-900">État des annonces</h2>
      <p className="mt-1 text-sm text-stone-600">Annonces visibles et désactivées.</p>
      <div className="mt-8 space-y-6">
        {[{ label: 'Actives', value: active, color: 'bg-green-600' }, { label: 'Désactivées', value: inactive, color: 'bg-stone-500' }].map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex justify-between text-sm"><span className="font-medium text-stone-700">{item.label}</span><strong>{item.value}</strong></div>
            <div className="h-5 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label={item.label} aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={active + inactive}>
              <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${Math.max((item.value / max) * 100, item.value ? 4 : 0)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const KYC_LABELS: Record<string, string> = {
  piece_identite: "Pièce d'identité",
  photo_atelier: "Photo de l'atelier",
  photo_produit_1: "Photo produit 1",
  photo_produit_2: "Photo produit 2",
  photo_produit_3: "Photo produit 3",
  video_vendeur_produit: "Vidéo vendeur avec produit",
  photo_produit: "Photo du produit seul",
  photo_produit_emballe: "Photo du produit emballé",
  photo_vendeur_produit: "Photo vendeur avec produit",
};

function ShopsAdmin({
  shops,
  page,
  pageSize,
  onPageChange,
  onReview,
  onAction,
}: {
  shops: Shop[];
  page: number;
  pageSize: number;
  onPageChange: (newPage: number | ((p: number) => number)) => void;
  onReview: (id: string, approve: boolean) => Promise<void>;
  onAction: (action: () => Promise<unknown>) => Promise<void>;
}) {
  const [activeDoc, setActiveDoc] = useState<{ url: string; label: string; shopName: string } | null>(null);
  const [expandedShops, setExpandedShops] = useState<Record<string, boolean>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const documentsToLoad = shops
      .filter((shop) => expandedShops[shop.id])
      .flatMap((shop) => (shop.kycDocuments ?? []).filter((doc) => doc.publicId).map((doc) => ({ shopId: shop.id, label: doc.label })));
    void Promise.all(documentsToLoad.map(async ({ shopId, label }) => {
      const key = `${shopId}:${label}`;
      if (signedUrls[key]) return;
      try {
        const result = await api.adminKycUrl(shopId, label);
        setSignedUrls((previous) => ({ ...previous, [key]: result.url }));
      } catch {
        // Le document reste indisponible si l’URL signée ne peut pas être générée.
      }
    }));
  }, [expandedShops, shops, signedUrls]);

  const toggleExpand = (shopId: string) => {
    setExpandedShops((prev) => ({ ...prev, [shopId]: !prev[shopId] }));
  };

  return (
    <>
      <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-xs">
        <div className="border-b border-stone-200 p-5">
          <h2 className="font-semibold">Validation des boutiques & Preuves KYC ({shops.length})</h2>
          <p className="mt-1 text-sm text-stone-600">
            Vérifiez les pièces justificatives, photos d'atelier et vidéos téléversées par les vendeurs avant validation.
          </p>
        </div>
        <div className="divide-y divide-stone-100">
          {shops.length === 0 ? (
            <p className="p-5 text-sm text-stone-600">Aucune boutique enregistrée.</p>
          ) : (
            shops.slice(page * pageSize, (page + 1) * pageSize).map((shop) => (
              <div key={shop.id} className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-stone-900">{shop.name}</p>
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-700">{shop.type}</span>
                      {shop.isWomenLed && (
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                          👩‍🎨 Entrepreneuriat Féminin
                        </span>
                      )}
                      {shop.isCooperative && (
                        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-800">
                          🤝 Coopérative / GIC
                        </span>
                      )}
                      {shop.verifiedBadge && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">✓ Vérifié</span>
                      )}
                      {shop.topSellerBadge && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">★ Top vendeur</span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      Vendeur : <strong>{shop.seller?.name || 'Artisan'}</strong> ({shop.seller?.email}) · Mobile Money : <strong>{shop.mobileMoneyNumber}</strong>
                    </p>
                    {shop.city && (
                      <p className="text-xs text-stone-500">
                        Localisation : {shop.city} {shop.neighborhood ? `· Quartier ${shop.neighborhood}` : ''} {shop.market ? `· Marché ${shop.market}` : ''}
                      </p>
                    )}
                    <p className="mt-1 text-sm">
                      <span
                        className={`inline-block font-medium px-2 py-0.5 rounded text-xs ${
                          shop.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : shop.status === 'pending'
                              ? 'bg-orange-100 text-orange-800 font-bold'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {shop.status === 'pending'
                          ? '⏳ En attente de validation manuelle'
                          : shop.status === 'active'
                            ? '✓ Active'
                            : shop.status === 'rejected'
                              ? `Rejetée — ${shop.rejectionReason ?? ''}`
                              : 'Suspendue'}
                      </span>
                    </p>
                  </div>
                  {shop.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => onReview(shop.id, true)}
                        className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 shadow-sm"
                      >
                        Approuver la boutique
                      </button>
                      <button
                        onClick={() => {
                          const reason = prompt('Motif du rejet (optionnel) :');
                          if (reason !== null) onReview(shop.id, false);
                        }}
                        className="rounded-md bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                      >
                        Rejeter
                      </button>
                    </div>
                  )}
                  {shop.status !== 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => void onAction(() => api.adminSetShopStatus(shop.id, shop.status === 'active' ? 'suspended' : 'active'))}
                        className="rounded-md bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        {shop.status === 'active' ? 'Désactiver' : 'Réactiver'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer définitivement la boutique « ${shop.name} » ?`)) void onAction(() => api.adminDeleteShop(shop.id));
                        }}
                        className="rounded-md bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        Supprimer
                      </button>
                    </div>
                  )}
                </div>

                {/* Galerie des pièces justificatives KYC (Collapsible) */}
                <div className="rounded-lg border border-stone-200 bg-stone-50 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleExpand(shop.id)}
                    className="flex w-full items-center justify-between p-3.5 text-left transition hover:bg-stone-100"
                  >
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-stone-700">
                      📂 Pièces justificatives et preuves KYC ({shop.kycDocuments?.length || 0})
                    </span>
                    <span className="text-xs font-medium text-amber-800 flex items-center gap-1">
                      {expandedShops[shop.id] ? 'Masquer les images ▲' : 'Afficher les images ▼'}
                    </span>
                  </button>

                  {expandedShops[shop.id] && (
                    <div className="border-t border-stone-200 p-3.5 bg-white">
                      {(!shop.kycDocuments || shop.kycDocuments.length === 0) ? (
                        <p className="text-xs text-stone-500 italic">Aucun document téléversé.</p>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {shop.kycDocuments.map((doc, idx) => {
                            const signedUrl = signedUrls[`${shop.id}:${doc.label}`];
                            const fileUrl = signedUrl ?? (doc.url.startsWith('http') ? doc.url : `${API_URL}${doc.url}`);
                            const isVideo = doc.resourceType === 'video' || doc.format === 'mp4' || doc.format === 'mov' || doc.label.includes('video');
                            const labelText = KYC_LABELS[doc.label] || doc.label;

                            return (
                              <div
                                key={idx}
                                className="group relative flex flex-col items-center overflow-hidden rounded-md border border-stone-300 bg-white p-2 shadow-xs transition hover:border-amber-600 hover:shadow-sm w-36"
                              >
                                <div
                                  onClick={async () => {
                                    const url = signedUrl ?? (doc.publicId ? (await api.adminKycUrl(shop.id, doc.label)).url : fileUrl);
                                    setActiveDoc({ url, label: labelText, shopName: shop.name });
                                  }}
                                  className="relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded bg-stone-100"
                                >
                                  {isVideo ? (
                                    <div className="flex flex-col items-center justify-center text-stone-500">
                                      <span className="text-2xl">🎬</span>
                                      <span className="mt-1 text-[10px] font-medium">Vidéo</span>
                                    </div>
                                  ) : (
                                    <img
                                      src={fileUrl}
                                      alt={labelText}
                                      className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                                      onError={(e) => {
                                        (e.target as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                                    🔍 Agrandir
                                  </span>
                                </div>
                                <span className="mt-2 text-center text-[11px] font-medium leading-tight text-stone-800 line-clamp-2">
                                  {labelText}
                                </span>
                                <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 text-[10px] text-amber-700 underline hover:text-amber-900"
                                >
                                  Ouvrir l'original ↗
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {shops.length > pageSize && (
          <div className="p-4 border-t border-stone-100">
            <Pagination
              page={page}
              hasPrevious={page > 0}
              hasNext={(page + 1) * pageSize < shops.length}
              onPrevious={() => onPageChange((p) => Math.max(0, p - 1))}
              onNext={() => onPageChange((p) => p + 1)}
            />
          </div>
        )}
      </section>

      {/* Modal d'aperçu plein écran du document */}
      {activeDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setActiveDoc(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-3xl overflow-hidden rounded-lg bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div>
                <h3 className="font-semibold text-stone-900">{activeDoc.label}</h3>
                <p className="text-xs text-stone-500">Boutique : {activeDoc.shopName}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={activeDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
                >
                  Ouvrir dans un nouvel onglet ↗
                </a>
                <button
                  onClick={() => setActiveDoc(null)}
                  className="rounded-full bg-stone-100 p-1.5 text-stone-600 hover:bg-stone-200"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="mt-4 flex max-h-[70vh] items-center justify-center overflow-auto rounded bg-stone-900/5 p-2">
              {activeDoc.url.toLowerCase().endsWith('.mp4') || activeDoc.url.toLowerCase().endsWith('.mov') || activeDoc.label.toLowerCase().includes('vidéo') ? (
                <video src={activeDoc.url} controls className="max-h-[65vh] w-auto rounded shadow-sm" autoPlay />
              ) : (
                <img src={activeDoc.url} alt={activeDoc.label} className="max-h-[65vh] w-auto object-contain rounded shadow-sm" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RecentOrders({
  orders,
  page,
  pageSize,
  onPageChange,
}: {
  orders: Order[];
  page: number;
  pageSize: number;
  onPageChange: (newPage: number | ((p: number) => number)) => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
      <div className="border-b border-stone-200 p-5">
        <h2 className="font-semibold">Dernières commandes ({orders.length})</h2>
        <p className="mt-1 text-sm text-stone-600">Suivi des transactions les plus récentes.</p>
      </div>
      <div className="divide-y divide-stone-100">
        {orders.length === 0 ? (
          <p className="p-5 text-sm text-stone-600">Aucune commande pour le moment.</p>
        ) : (
          orders.slice(page * pageSize, (page + 1) * pageSize).map((order) => (
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
      {orders.length > pageSize && (
        <div className="p-4 border-t border-stone-100">
          <Pagination
            page={page}
            hasPrevious={page > 0}
            hasNext={(page + 1) * pageSize < orders.length}
            onPrevious={() => onPageChange((p) => Math.max(0, p - 1))}
            onNext={() => onPageChange((p) => p + 1)}
          />
        </div>
      )}
    </section>
  );
}

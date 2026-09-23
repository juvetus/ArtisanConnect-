'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { formatXAF } from '@/lib/format';
import { StatusBadge } from '@/components/StatusBadge';
import { Pagination } from '@/components/Pagination';
import { ModerationAdmin } from '@/components/ModerationAdmin';
import { AnalyticsFunnel } from '@/components/AnalyticsFunnel';
import type { AdminStats, AdminSubscription, ArtisanFormalization, Listing, Order, Role, Shop, User } from '@/lib/types';

interface ServiceDashboardStats {
  stats: {
    pendingValidationCount: number;
    validationRequestedCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgValidationTimeHours: number;
  };
}

const ADMIN_CREATABLE_ROLES: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'client', label: 'Client' },
  { value: 'artisan', label: 'Artisan / vendeur' },
  { value: 'institution', label: 'Institution' },
];

type AdminUserKind = Role | 'cooperative';

const ADMIN_USER_KIND_OPTIONS: { value: AdminUserKind; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Éditeur' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'client', label: 'Client' },
  { value: 'artisan', label: 'Artisan / vendeur' },
  { value: 'cooperative', label: 'Coopérative / GIC' },
  { value: 'institution', label: 'Institution' },
];

const ARTISAN_PROFILE_TYPES = [
  { value: 'female', label: 'Femme artisane' },
  { value: 'cooperative', label: 'Coopérative / GIC' },
  { value: 'male', label: 'Homme artisan' },
  { value: 'other', label: 'Autre' },
] as const;

function roleLabel(role: Role) {
  return ADMIN_CREATABLE_ROLES.find((item) => item.value === role)?.label ?? role;
}

export default function AdminPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [view, setView] = useState<'overview' | 'users' | 'listings' | 'shops' | 'formalizations' | 'orders' | 'subscriptions' | 'moderation' | 'analytics'>('overview');
  const [actionError, setActionError] = useState('');
  const [usersPage, setUsersPage] = useState(0);
  const [listingsPage, setListingsPage] = useState(0);
  const [shopsPage, setShopsPage] = useState(0);
  const [recentOrdersPage, setRecentOrdersPage] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<Role | 'all'>('all');
  const [userGenderFilter, setUserGenderFilter] = useState<'all' | 'female' | 'male' | 'cooperative' | 'other'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer' as Role,
    kind: 'viewer' as AdminUserKind,
    gender: 'cooperative' as 'female' | 'male' | 'cooperative' | 'other',
  });
  const PAGE_SIZE = 10;

  const { data, isLoading, mutate } = useSWR(
    user && ['admin', 'editor', 'viewer'].includes(user.role) ? ['admin-console', user.id] : null,
    async () => {
      const [overview, users, listings, shops, formalizations, adminOrders, adminSubscriptions, serviceDashboard] = await Promise.all([
        api.adminOverview(),
        user?.role === 'admin' ? api.adminUsers() : Promise.resolve([] as User[]),
        api.adminListings(),
        api.adminShops(),
        user?.role !== 'viewer' ? api.adminFormalizations() : Promise.resolve([] as ArtisanFormalization[]),
        api.adminOrders(),
        api.adminSubscriptions(),
        api.getServiceDashboardStats(),
      ]);
      return { overview, users, listings, shops, formalizations, adminOrders, adminSubscriptions, serviceDashboard: serviceDashboard as ServiceDashboardStats };
    },
  );

  useEffect(() => {
    if (ready && (!user || !['admin', 'editor', 'viewer'].includes(user.role))) router.replace('/');
  }, [ready, user, router]);

  if (!ready || !user || !['admin', 'editor', 'viewer'].includes(user.role) || isLoading || !data) {
    return <p className="text-stone-600">Chargement de l&apos;administration…</p>;
  }

  const { stats, recentOrders } = data.overview;
  const normalizedUserSearch = userSearch.trim().toLowerCase();
  const filteredUsers = data.users.filter((member) => {
    const matchesSearch = normalizedUserSearch
      ? [
      member.name,
      member.email,
      roleLabel(member.role),
      member.role,
      member.gender === 'female' ? 'femme artisane' : undefined,
      member.gender === 'cooperative' ? 'coopérative gic cooperative' : undefined,
      member.gender,
      member.isActive === false ? 'désactivé desactive inactive' : 'actif active',
    ].filter(Boolean).join(' ').toLowerCase().includes(normalizedUserSearch)
      : true;
    const matchesRole = userRoleFilter === 'all' || member.role === userRoleFilter;
    const matchesGender = userGenderFilter === 'all' || member.gender === userGenderFilter;
    const matchesStatus = userStatusFilter === 'all' || (userStatusFilter === 'active' ? member.isActive !== false : member.isActive === false);

    return matchesSearch && matchesRole && matchesGender && matchesStatus;
  });
  const hasUserFilters = Boolean(normalizedUserSearch || userRoleFilter !== 'all' || userGenderFilter !== 'all' || userStatusFilter !== 'all');

  const moderateListing = async (listing: Listing) => {
    await api.adminSetListingStatus(listing.id, listing.status === 'active' ? 'inactive' : 'active');
    await mutate();
  };

  const changeRole = async (member: User, role: Role) => {
    await api.adminSetUserRole(member.id, role);
    await mutate();
  };

  const createUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await runAdminAction(async () => {
      await api.adminCreateUser({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.kind === 'cooperative' ? 'artisan' : newUser.role,
        gender: newUser.kind === 'cooperative' ? 'cooperative' : newUser.role === 'artisan' ? newUser.gender : undefined,
      });
      setNewUser({ name: '', email: '', password: '', role: 'viewer', kind: 'viewer', gender: 'cooperative' });
      setUsersPage(0);
      setView('users');
    });
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

  const reviewFormalization = async (record: ArtisanFormalization, status: ArtisanFormalization['status']) => {
    const notes = status === 'rejected' ? prompt('Motif ou correction demandée :') ?? '' : undefined;
    if (status === 'rejected' && !(notes ?? '').trim()) return;
    await runAdminAction(() => api.adminReviewFormalization(record.id, status, notes));
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
            ...(user.role !== 'viewer' ? [['shops', 'Boutiques']] : []),
            ...(user.role !== 'viewer' ? [['formalizations', 'Formalisations']] : []),
            ...(user.role === 'admin' ? [['users', 'Utilisateurs']] : []),
            ...(user.role !== 'viewer' ? [['listings', 'Annonces']] : []),
            ...(user.role === 'admin' ? [['moderation', 'Modération']] : []),
            ...(user.role === 'admin' ? [['analytics', 'Analytics']] : []),
            ...(user.role === 'admin' ? [['subscriptions', 'Abonnements']] : []),
            ['orders', 'Commandes'],
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

      {view === 'overview' && (
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
      )}

      {view === 'overview' && (
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
      )}

      {view === 'overview' && (
        <section className="rounded-lg border border-amber-200 bg-amber-50/60 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-stone-900">Indicateurs du pilote vendeur</h2>
              <p className="mt-1 text-sm text-stone-600">Données cumulées des boutiques actives.</p>
            </div>
            <span className="text-xs font-medium uppercase tracking-wide text-amber-800">Lecture équipe admin</span>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              ['Boutiques actives', stats.activeShops ?? 0],
              ['Vues boutique', stats.shopViews ?? 0],
              ['Contacts WhatsApp', stats.whatsappContacts ?? 0],
              ['Partages', stats.shopShares ?? 0],
              ['Ventes réussies', stats.successfulSales ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-amber-100 bg-white p-4">
                <p className="text-sm text-stone-600">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {actionError && <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      {view === 'shops' && (
        <ShopsAdmin
          shops={data.shops}
          page={shopsPage}
          pageSize={PAGE_SIZE}
          onPageChange={setShopsPage}
          canDelete={user.role === 'admin'}
          onReview={async (id, approve) => { await api.adminReviewShop(id, approve); await mutate(); }}
          onAction={runAdminAction}
        />
      )}

      {view === 'formalizations' && (
        <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Dossiers de formalisation ({data.formalizations.length})</h2>
            <p className="mt-1 text-sm text-stone-600">Vérifiez les informations et justificatifs transmis par les artisans du pilote.</p>
          </div>
          {!data.formalizations.length ? <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">Aucun dossier reçu pour le moment.</p> : (
            <div className="space-y-4">
              {data.formalizations.map((record) => {
                let documentUrls: string[] = [];
                try {
                  const parsed = record.documentsUrl ? JSON.parse(record.documentsUrl) : [];
                  documentUrls = Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === 'string') : record.documentsUrl ? [record.documentsUrl] : [];
                } catch {
                  documentUrls = record.documentsUrl ? [record.documentsUrl] : [];
                }
                return (
                  <article key={record.id} className="rounded-md border border-stone-200 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-stone-900">{record.businessName}</h3>
                        <p className="mt-1 text-sm text-stone-600">Artisan : {record.artisan?.name ?? 'Artisan'} · {record.artisan?.email}</p>
                        <p className="mt-1 text-sm text-stone-600">Enregistrement : {record.registrationNumber || 'Non renseigné'} · Identifiant fiscal : {record.taxId || 'Non renseigné'}</p>
                        <span className="mt-2 inline-block rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">{record.status}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {record.status !== 'approved' && <button type="button" onClick={() => void reviewFormalization(record, 'approved')} className="rounded-md bg-green-700 px-3 py-2 text-sm font-medium text-white hover:bg-green-800">Approuver</button>}
                        {record.status !== 'in_review' && record.status !== 'approved' && <button type="button" onClick={() => void reviewFormalization(record, 'in_review')} className="rounded-md border border-amber-300 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50">En examen</button>}
                        {record.status !== 'rejected' && record.status !== 'approved' && <button type="button" onClick={() => void reviewFormalization(record, 'rejected')} className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Rejeter / correction</button>}
                      </div>
                    </div>
                    {documentUrls.length ? <div className="mt-3 flex flex-wrap gap-2">{documentUrls.map((url, index) => <a key={url} href={url} target="_blank" rel="noreferrer" className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-amber-800 underline">Justificatif {index + 1}</a>)}</div> : <p className="mt-3 text-sm text-stone-500">Aucun justificatif joint.</p>}
                    {record.institutionNotes ? <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-900">Retour : {record.institutionNotes}</p> : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {view === 'moderation' && <ModerationAdmin />}

      {view === 'analytics' && <AnalyticsFunnel />}

      {view === 'subscriptions' && <AdminSubscriptions subscriptions={data.adminSubscriptions} />}

      {view === 'orders' && (
        <AdminOrders
          orders={data.adminOrders}
          canManage={user.role === 'admin'}
          onCancel={(id) => runAdminAction(async () => { await api.adminCancelOrder(id); })}
          onRefund={(id) => runAdminAction(async () => { await api.adminRefundOrder(id); })}
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
        <div className="space-y-4">
          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Ajouter un utilisateur</h2>
            <p className="mt-1 text-sm text-stone-600">Réservé aux administrateurs. Le mot de passe initial doit être transmis par un canal sûr.</p>
            <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_180px_180px_auto]">
              <input
                required
                value={newUser.name}
                onChange={(event) => setNewUser((current) => ({ ...current, name: event.target.value }))}
                placeholder="Nom"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
              />
              <input
                required
                type="email"
                value={newUser.email}
                onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                placeholder="email@exemple.cm"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
              />
              <input
                required
                type="password"
                minLength={8}
                value={newUser.password}
                onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                placeholder="Mot de passe"
                className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
              />
              <select
                value={newUser.kind}
                onChange={(event) => {
                  const kind = event.target.value as AdminUserKind;
                  setNewUser((current) => ({
                    ...current,
                    kind,
                    role: kind === 'cooperative' ? 'artisan' : kind,
                    gender: kind === 'cooperative' ? 'cooperative' : current.gender,
                  }));
                }}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
              >
                {ADMIN_USER_KIND_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
              </select>
              {newUser.kind === 'artisan' && (
                <select
                  value={newUser.gender}
                  onChange={(event) => setNewUser((current) => ({ ...current, gender: event.target.value as typeof newUser.gender }))}
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600 md:col-span-4"
                  aria-label="Profil artisan"
                >
                  {ARTISAN_PROFILE_TYPES.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
                </select>
              )}
              <button className="rounded-md bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
                Ajouter
              </button>
            </form>
          </section>

          <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
            <div className="border-b border-stone-200 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Utilisateurs ({filteredUsers.length}/{data.users.length})</h2>
                  <p className="mt-1 text-sm text-stone-600">Les mots de passe ne sont jamais exposés.</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_180px_180px_160px_auto]">
                <label className="text-sm font-medium text-stone-700">
                  Recherche
                  <input
                    type="search"
                    value={userSearch}
                    onChange={(event) => { setUserSearch(event.target.value); setUsersPage(0); }}
                    placeholder="Nom ou e-mail"
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
                  />
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Rôle
                  <select
                    value={userRoleFilter}
                    onChange={(event) => { setUserRoleFilter(event.target.value as Role | 'all'); setUsersPage(0); }}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
                  >
                    <option value="all">Tous</option>
                    {ADMIN_CREATABLE_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Profil
                  <select
                    value={userGenderFilter}
                    onChange={(event) => { setUserGenderFilter(event.target.value as typeof userGenderFilter); setUsersPage(0); }}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
                  >
                    <option value="all">Tous</option>
                    {ARTISAN_PROFILE_TYPES.map((profile) => <option key={profile.value} value={profile.value}>{profile.label}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium text-stone-700">
                  Statut
                  <select
                    value={userStatusFilter}
                    onChange={(event) => { setUserStatusFilter(event.target.value as typeof userStatusFilter); setUsersPage(0); }}
                    className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
                  >
                    <option value="all">Tous</option>
                    <option value="active">Actifs</option>
                    <option value="inactive">Désactivés</option>
                  </select>
                </label>
                <button
                  type="button"
                  disabled={!hasUserFilters}
                  onClick={() => { setUserSearch(''); setUserRoleFilter('all'); setUserGenderFilter('all'); setUserStatusFilter('all'); setUsersPage(0); }}
                  className="self-end rounded-md border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
            <div className="divide-y divide-stone-100">
              {filteredUsers.slice(usersPage * PAGE_SIZE, (usersPage + 1) * PAGE_SIZE).map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-sm text-stone-600">{member.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs">{roleLabel(member.role)}</span>
                    {member.gender && (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-700 capitalize">
                        {member.gender === 'female' ? 'Femme' : member.gender === 'cooperative' ? 'Coopérative' : member.gender}
                      </span>
                    )}
                    {member.isActive === false && <span className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-700">Désactivé</span>}
                    {member.role !== 'admin' && (
                      <>
                        <select
                          value={member.role}
                          onChange={(event) => void runAdminAction(() => changeRole(member, event.target.value as Role))}
                          className="rounded-md border border-stone-200 px-2 py-1 text-sm"
                        >
                          {ADMIN_CREATABLE_ROLES.filter((role) => role.value !== 'admin').map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
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
              {filteredUsers.length === 0 && (
                <p className="p-4 text-sm text-stone-500">Aucun utilisateur ne correspond à cette recherche.</p>
              )}
            </div>
            {filteredUsers.length > PAGE_SIZE && (
              <div className="p-4 border-t border-stone-100">
                <Pagination
                  page={usersPage}
                  hasPrevious={usersPage > 0}
                  hasNext={(usersPage + 1) * PAGE_SIZE < filteredUsers.length}
                  onPrevious={() => setUsersPage((p) => Math.max(0, p - 1))}
                  onNext={() => setUsersPage((p) => p + 1)}
                />
              </div>
            )}
          </section>
        </div>
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
                  {user.role === 'admin' ? <button
                    onClick={() => {
                      if (confirm(`Supprimer définitivement l'annonce « ${listing.title} » ?`)) void runAdminAction(() => api.adminDeleteListing(listing.id));
                    }}
                    className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                  >
                    Supprimer
                  </button> : null}
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
  canDelete,
}: {
  shops: Shop[];
  page: number;
  pageSize: number;
  onPageChange: (newPage: number | ((p: number) => number)) => void;
  onReview: (id: string, approve: boolean) => Promise<void>;
  onAction: (action: () => Promise<unknown>) => Promise<void>;
  canDelete: boolean;
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
            Vérifiez les pièces justificatives, photos d&apos;atelier et vidéos téléversées par les vendeurs avant validation.
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
                      {shop.identityVerified && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">✔ Identité vérifiée</span>
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
                      {canDelete ? <button
                        onClick={() => onReview(shop.id, true)}
                        className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 shadow-sm"
                      >
                        Approuver la boutique
                      </button> : null}
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
                      {canDelete ? (
                        <button
                          onClick={() => {
                            if (shop.identityVerified || confirm(`Confirmez-vous avoir contrôlé la pièce d'identité de « ${shop.name} » ?`)) {
                              void onAction(() => api.adminSetShopIdentityVerified(shop.id, !shop.identityVerified));
                            }
                          }}
                          className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
                        >
                          {shop.identityVerified ? 'Retirer « Identité vérifiée »' : 'Marquer l’identité vérifiée'}
                        </button>
                      ) : null}
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
                                  Ouvrir l&apos;original ↗
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

function AdminSubscriptions({ subscriptions }: { subscriptions: AdminSubscription[] }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AdminSubscription['status'] | 'all'>('all');
  const [page, setPage] = useState(0);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredSubscriptions = subscriptions.filter((subscription) => {
    const haystack = [
      subscription.user?.name,
      subscription.user?.email,
      subscription.plan?.name,
      subscription.plan?.slug,
      subscription.paymentReference,
    ].filter(Boolean).join(' ').toLowerCase();
    return (!normalizedSearch || haystack.includes(normalizedSearch)) && (status === 'all' || subscription.status === status);
  });

  const statusLabels: Record<AdminSubscription['status'], string> = {
    pending: 'En attente',
    active: 'Active',
    failed: 'Échec',
    cancelled: 'Annulée',
  };

  return (
    <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Gestion des abonnements ({filteredSubscriptions.length}/{subscriptions.length})</h2>
        <p className="mt-1 text-sm text-stone-600">Suivez les plans souscrits, les paiements et les dates d’expiration.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input
          value={search}
          onChange={(event) => { setSearch(event.target.value); setPage(0); }}
          placeholder="Artisan, e-mail, plan ou référence..."
          className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
        />
        <select value={status} onChange={(event) => { setStatus(event.target.value as AdminSubscription['status'] | 'all'); setPage(0); }} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      {!filteredSubscriptions.length ? (
        <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">Aucun abonnement ne correspond à votre recherche.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-3 py-3">Artisan</th>
                <th className="px-3 py-3">Plan</th>
                <th className="px-3 py-3">Montant</th>
                <th className="px-3 py-3">Statut</th>
                <th className="px-3 py-3">Expiration</th>
                <th className="px-3 py-3">Paiement</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubscriptions.slice(page * 10, (page + 1) * 10).map((subscription) => (
                <tr key={subscription.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-medium text-stone-900">{subscription.user?.name ?? 'Utilisateur supprimé'}</p>
                    <p className="text-xs text-stone-500">{subscription.user?.email ?? '—'}</p>
                  </td>
                  <td className="px-3 py-3 text-stone-700">{subscription.plan?.name ?? 'Plan supprimé'}</td>
                  <td className="px-3 py-3 font-medium text-stone-900">{formatXAF(subscription.amount)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${subscription.status === 'active' ? 'bg-emerald-100 text-emerald-700' : subscription.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-stone-100 text-stone-700'}`}>
                      {statusLabels[subscription.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-stone-600">{subscription.endDate ? new Date(subscription.endDate).toLocaleDateString('fr-FR') : '—'}</td>
                  <td className="px-3 py-3 text-xs text-stone-500">{subscription.paymentReference ?? subscription.provider}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {filteredSubscriptions.length > 10 ? <Pagination page={page} hasPrevious={page > 0} hasNext={(page + 1) * 10 < filteredSubscriptions.length} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} /> : null}
    </section>
  );
}

function AdminOrders({
  orders,
  canManage,
  onCancel,
  onRefund,
}: {
  orders: Order[];
  canManage: boolean;
  onCancel: (id: string) => Promise<void>;
  onRefund: (id: string) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Order['status'] | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const normalizedSearch = search.trim().toLowerCase();
  const filteredOrders = orders.filter((order) => {
    const haystack = [order.id, order.listing?.title, order.buyer?.name, order.buyer?.email, order.seller?.name, order.seller?.email, order.paymentMethod]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (!normalizedSearch || haystack.includes(normalizedSearch)) && (status === 'all' || order.status === status);
  });

  return (
    <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">Gestion des commandes ({filteredOrders.length}/{orders.length})</h2>
        <p className="mt-1 text-sm text-stone-600">Recherchez une commande, consultez tous ses détails, annulez-la ou enregistrez un remboursement.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-[1fr_220px]">
        <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(0); }} placeholder="ID, client, vendeur, article, e-mail..." className="rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600" />
        <select value={status} onChange={(event) => { setStatus(event.target.value as Order['status'] | 'all'); setPage(0); }} className="rounded-md border border-stone-300 px-3 py-2 text-sm">
          <option value="all">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="confirmed">Confirmées</option>
          <option value="completed">Terminées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>
      {!filteredOrders.length ? <p className="rounded-md bg-stone-50 p-4 text-sm text-stone-600">Aucune commande ne correspond à votre recherche.</p> : (
        <div className="divide-y divide-stone-100">
          {filteredOrders.slice(page * 10, (page + 1) * 10).map((order) => {
            const isExpanded = expanded === order.id;
            const canCancel = order.status !== 'cancelled' && order.status !== 'completed';
            const canRefund = order.payment?.status === 'confirmed' || order.payment?.status === 'captured';
            return (
              <article key={order.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{order.listing?.title ?? 'Annonce supprimée'}</p>
                    <p className="text-sm text-stone-600">{order.buyer?.name ?? 'Client'} → {order.seller?.name ?? 'Vendeur'} · {formatXAF(order.totalPrice)}</p>
                    <p className="text-xs text-stone-500">Réf. {order.id} · {new Date(order.createdAt).toLocaleString('fr-FR')}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={order.status} />
                    <button onClick={() => setExpanded(isExpanded ? null : order.id)} className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50">
                      {isExpanded ? 'Réduire' : 'Voir les détails'}
                    </button>
                  </div>
                </div>
                {isExpanded ? (
                  <div className="mt-4 grid gap-3 rounded-md bg-stone-50 p-4 text-sm text-stone-700 sm:grid-cols-2">
                    <p><strong>Client :</strong> {order.buyer?.name} · {order.buyer?.email}</p>
                    <p><strong>Vendeur :</strong> {order.seller?.name} · {order.seller?.email}</p>
                    <p><strong>Quantité :</strong> {order.quantity}</p>
                    <p><strong>Paiement :</strong> {order.paymentMethod} · {order.payment?.status ?? 'non créé'}</p>
                    <p><strong>Livraison :</strong> {order.deliveryMethod === 'workshop' ? "Retrait à l'atelier" : order.deliveryMethod === 'home' ? 'Livraison à domicile' : `Transporteur${order.deliveryAddress ? ` · ${order.deliveryAddress}` : ''}`}</p>
                    {order.deliveryMethod === 'carrier' ? <p><strong>Suivi :</strong> {order.deliveryStatus}{order.deliveryTrackingId ? ` · ${order.deliveryTrackingId}` : ''}</p> : null}
                    {order.cancellationReason ? <p className="sm:col-span-2"><strong>Motif :</strong> {order.cancellationReason}</p> : null}
                    <div className="flex flex-wrap gap-2 sm:col-span-2">
                      {canManage && canCancel ? <button onClick={() => { if (window.confirm('Annuler cette commande et restituer le stock ?')) void onCancel(order.id); }} className="rounded-md bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700">Annuler la commande</button> : null}
                      {canManage && canRefund ? <button onClick={() => { if (window.confirm('Enregistrer le remboursement de ce paiement ?')) void onRefund(order.id); }} className="rounded-md bg-amber-700 px-3 py-2 text-xs font-medium text-white hover:bg-amber-800">Rembourser</button> : null}
                      {(!canManage || (!canCancel && !canRefund)) ? <span className="text-xs text-stone-500">Lecture seule.</span> : null}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}
      {filteredOrders.length > 10 ? <Pagination page={page} hasPrevious={page > 0} hasNext={(page + 1) * 10 < filteredOrders.length} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} /> : null}
    </section>
  );
}

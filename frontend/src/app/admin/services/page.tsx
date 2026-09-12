'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import Link from 'next/link';
import type { ServiceValidationHistory } from '@/lib/types';

interface DashboardStats {
  stats: {
    pendingValidationCount: number;
    validationRequestedCount: number;
    approvedCount: number;
    rejectedCount: number;
    avgValidationTimeHours: number;
  };
  pendingServices: Array<{
    id: string;
    title: string;
    artisanName: string;
    createdAt: string;
    category: string;
  }>;
  revisionServices: Array<{
    id: string;
    title: string;
    artisanName: string;
    revisionDueAt: string;
    category: string;
    feedback: string;
  }>;
}

interface ServiceDetail {
  id: string;
  title: string;
  description: string;
  price?: number;
  priceMin?: number;
  priceMax?: number;
  estimatedDays: number;
  category: string;
  tags?: string[];
  fileUrls?: string[];
  artisan?: { name: string; email: string };
  status: string;
  validationFeedback?: string;
  createdAt: string;
}

type TabType = 'dashboard' | 'pending' | 'revision';

export default function AdminServicesPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabType>('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [action, setAction] = useState<'approve' | 'reject' | 'revise' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [history, setHistory] = useState<ServiceValidationHistory[]>([]);

  useEffect(() => {
    if (ready && (!user || user.role !== 'admin')) {
      router.push('/');
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (ready && user?.role === 'admin') {
      loadStats();
    }
  }, [ready, user, tab]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await api.getServiceDashboardStats() as DashboardStats;
      setStats(data);
      setHistory((await api.getServiceValidationHistory()) as ServiceValidationHistory[]);
    } catch (error) {
      setNotice({ type: 'error', message: 'Erreur lors du chargement des statistiques' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewService = async (serviceId: string) => {
    try {
      const service = await api.getService(serviceId) as ServiceDetail;
      setSelectedService(service);
      setShowDetailModal(true);
      setFeedback('');
      setAction(null);
    } catch (error) {
      setNotice({ type: 'error', message: 'Erreur lors du chargement du service' });
    }
  };

  const handleApproveService = async () => {
    if (!selectedService) return;
    try {
      setSubmitting(true);
      await api.approveService(selectedService.id);
      setNotice({ type: 'success', message: 'Service approuvé avec succès' });
      setShowDetailModal(false);
      loadStats();
    } catch (error) {
      setNotice({ type: 'error', message: 'Erreur lors de l\'approbation' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectService = async () => {
    if (!selectedService || !feedback.trim()) {
      setNotice({ type: 'error', message: 'Un feedback est requis pour le refus' });
      return;
    }
    try {
      setSubmitting(true);
      await api.rejectService(selectedService.id, feedback);
      setNotice({ type: 'success', message: 'Service rejeté avec succès' });
      setShowDetailModal(false);
      loadStats();
    } catch (error) {
      setNotice({ type: 'error', message: 'Erreur lors du refus' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!selectedService || !feedback.trim()) {
      setNotice({ type: 'error', message: 'Un feedback est requis pour demander une révision' });
      return;
    }
    try {
      setSubmitting(true);
      await api.requestServiceRevision(selectedService.id, feedback);
      setNotice({ type: 'success', message: 'Demande de révision envoyée avec succès' });
      setShowDetailModal(false);
      loadStats();
    } catch (error) {
      setNotice({ type: 'error', message: 'Erreur lors de la demande de révision' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.exportServicesCsv();
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `services-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setNotice({ type: 'error', message: 'Erreur lors de l\'export CSV' });
    }
  };

  if (!ready || !user || user.role !== 'admin') {
    return null;
  }

  const getTimeRemaining = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const hoursRemaining = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursRemaining < 0) return '⏰ Dépassé';
    if (hoursRemaining < 24) return `⏰ ${hoursRemaining}h restantes`;
    return `⏰ ${Math.round(hoursRemaining / 24)}j restants`;
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900">Validation des services</h1>
          <p className="mt-2 text-sm text-stone-600">Gérez les services en attente de validation et de révision</p>
        </div>

        {/* Notice */}
        {notice && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              notice.type === 'success'
                ? 'border border-green-200 bg-green-50 text-green-800'
                : 'border border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {notice.message}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-stone-200">
          <button
            onClick={() => setTab('dashboard')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'dashboard'
                ? 'border-b-2 border-amber-700 text-amber-700'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            📊 Tableau de bord
          </button>
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'pending'
                ? 'border-b-2 border-amber-700 text-amber-700'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            ⏳ En attente ({stats?.stats.pendingValidationCount || 0})
          </button>
          <button
            onClick={() => setTab('revision')}
            className={`px-4 py-2 font-medium transition-colors ${
              tab === 'revision'
                ? 'border-b-2 border-amber-700 text-amber-700'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🔄 Révision ({stats?.stats.validationRequestedCount || 0})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-stone-600">Chargement...</p>
          </div>
        ) : stats ? (
          <>
            {/* Dashboard Tab */}
            {tab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                    <p className="text-sm text-amber-700">En attente de validation</p>
                    <p className="mt-2 text-3xl font-bold text-amber-900">
                      {stats.stats.pendingValidationCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-6">
                    <p className="text-sm text-orange-700">Révision demandée</p>
                    <p className="mt-2 text-3xl font-bold text-orange-900">
                      {stats.stats.validationRequestedCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                    <p className="text-sm text-green-700">Approuvés</p>
                    <p className="mt-2 text-3xl font-bold text-green-900">
                      {stats.stats.approvedCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-6">
                    <p className="text-sm text-red-700">Rejetés</p>
                    <p className="mt-2 text-3xl font-bold text-red-900">
                      {stats.stats.rejectedCount}
                    </p>
                  </div>
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
                    <p className="text-sm text-blue-700">Temps moyen</p>
                    <p className="mt-2 text-3xl font-bold text-blue-900">
                      {stats.stats.avgValidationTimeHours}h
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-stone-200 bg-white p-6">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-stone-900">Répartition des services</h2>
                      <p className="mt-1 text-sm text-stone-600">Vue actuelle des statuts de validation.</p>
                    </div>
                    <span className="text-xs text-stone-500">
                      Total : {stats.stats.pendingValidationCount + stats.stats.validationRequestedCount + stats.stats.approvedCount + stats.stats.rejectedCount}
                    </span>
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      { label: 'En attente', value: stats.stats.pendingValidationCount, color: 'bg-amber-500' },
                      { label: 'Révision demandée', value: stats.stats.validationRequestedCount, color: 'bg-orange-500' },
                      { label: 'Approuvés', value: stats.stats.approvedCount, color: 'bg-green-500' },
                      { label: 'Rejetés', value: stats.stats.rejectedCount, color: 'bg-red-500' },
                    ].map((item) => {
                      const total = stats.stats.pendingValidationCount + stats.stats.validationRequestedCount + stats.stats.approvedCount + stats.stats.rejectedCount;
                      const width = total > 0 ? Math.max((item.value / total) * 100, item.value > 0 ? 3 : 0) : 0;
                      return (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-sm">
                            <span className="font-medium text-stone-700">{item.label}</span>
                            <span className="text-stone-500">{item.value}</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-stone-100" role="progressbar" aria-label={item.label} aria-valuenow={item.value} aria-valuemin={0} aria-valuemax={total}>
                            <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${width}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleExportCsv}
                  className="rounded-md border border-stone-300 bg-white px-4 py-2 font-medium text-stone-700 hover:bg-stone-50"
                >
                  Exporter les services en CSV
                </button>

                <div className="rounded-lg border border-stone-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-stone-900">Historique des validations</h2>
                  {!history.length ? <p className="text-sm text-stone-600">Aucune validation enregistrée.</p> : (
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3 text-sm last:border-0">
                          <div><p className="font-medium text-stone-900">{entry.service?.title ?? 'Service'}</p><p className="text-stone-600">{entry.admin?.name ?? 'Automatique'} · {entry.feedback || entry.action}</p></div>
                          <div className="text-right text-xs text-stone-500"><p>{entry.action}</p><p>{new Date(entry.createdAt).toLocaleString('fr-FR')}</p></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Pending */}
                <div className="rounded-lg border border-stone-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-stone-900">
                    ⏳ Services en attente ({stats.pendingServices.length})
                  </h2>
                  {stats.pendingServices.length === 0 ? (
                    <p className="text-stone-600">Aucun service en attente</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-stone-200">
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Service</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Artisan</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Catégorie</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Créé</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.pendingServices.map((service) => (
                            <tr key={service.id} className="border-b border-stone-100 hover:bg-stone-50">
                              <td className="px-4 py-2 font-medium text-stone-900">{service.title}</td>
                              <td className="px-4 py-2 text-stone-600">{service.artisanName}</td>
                              <td className="px-4 py-2 text-stone-600">{service.category}</td>
                              <td className="px-4 py-2 text-stone-600">
                                {new Date(service.createdAt).toLocaleDateString('fr-FR')}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => handleViewService(service.id)}
                                  className="text-amber-700 hover:text-amber-800 font-medium"
                                >
                                  Examiner →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Recent Revisions */}
                <div className="rounded-lg border border-stone-200 bg-white p-6">
                  <h2 className="mb-4 text-lg font-semibold text-stone-900">
                    🔄 Services en révision ({stats.revisionServices.length})
                  </h2>
                  {stats.revisionServices.length === 0 ? (
                    <p className="text-stone-600">Aucun service en révision</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-stone-200">
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Service</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Artisan</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Délai</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Feedback</th>
                            <th className="px-4 py-2 text-left font-medium text-stone-700">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.revisionServices.map((service) => (
                            <tr key={service.id} className="border-b border-stone-100 hover:bg-stone-50">
                              <td className="px-4 py-2 font-medium text-stone-900">{service.title}</td>
                              <td className="px-4 py-2 text-stone-600">{service.artisanName}</td>
                              <td className="px-4 py-2">
                                <span
                                  className={`text-xs font-medium ${
                                    service.revisionDueAt &&
                                    new Date(service.revisionDueAt).getTime() - new Date().getTime() < 0
                                      ? 'text-red-600'
                                      : 'text-orange-600'
                                  }`}
                                >
                                  {getTimeRemaining(service.revisionDueAt)}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-stone-600 max-w-xs truncate">
                                {service.feedback}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => handleViewService(service.id)}
                                  className="text-amber-700 hover:text-amber-800 font-medium"
                                >
                                  Vérifier →
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Pending Tab */}
            {tab === 'pending' && (
              <div className="space-y-4">
                {stats.pendingServices.length === 0 ? (
                  <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
                    <p className="text-stone-600">Aucun service en attente de validation ✓</p>
                  </div>
                ) : (
                  stats.pendingServices.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center justify-between rounded-lg border border-stone-200 bg-white p-4"
                    >
                      <div>
                        <h3 className="font-semibold text-stone-900">{service.title}</h3>
                        <p className="text-sm text-stone-600">
                          {service.artisanName} • {service.category}
                        </p>
                      </div>
                      <button
                        onClick={() => handleViewService(service.id)}
                        className="rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800"
                      >
                        Examiner
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Revision Tab */}
            {tab === 'revision' && (
              <div className="space-y-4">
                {stats.revisionServices.length === 0 ? (
                  <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
                    <p className="text-stone-600">Aucun service en révision ✓</p>
                  </div>
                ) : (
                  stats.revisionServices.map((service) => (
                    <div
                      key={service.id}
                      className="rounded-lg border border-stone-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-stone-900">{service.title}</h3>
                          <p className="text-sm text-stone-600">
                            {service.artisanName} • {service.category}
                          </p>
                          <div className="mt-3 rounded-md bg-stone-50 p-3">
                            <p className="text-xs font-medium text-stone-700">Modifications demandées :</p>
                            <p className="mt-1 text-sm text-stone-600">{service.feedback}</p>
                          </div>
                          <p
                            className={`mt-3 text-xs font-medium ${
                              new Date(service.revisionDueAt).getTime() - new Date().getTime() < 0
                                ? 'text-red-600'
                                : 'text-orange-600'
                            }`}
                          >
                            {getTimeRemaining(service.revisionDueAt)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleViewService(service.id)}
                          className="ml-4 rounded-md bg-amber-700 px-4 py-2 font-medium text-white hover:bg-amber-800 whitespace-nowrap"
                        >
                          Vérifier
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-stone-600">Erreur lors du chargement</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-stone-900">{selectedService.title}</h2>
                <p className="mt-1 text-sm text-stone-600">
                  {selectedService.artisan?.name} • {selectedService.category}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-2xl text-stone-400 hover:text-stone-600"
              >
                ✕
              </button>
            </div>

            {/* Service Details */}
            <div className="mb-6 space-y-4 border-t border-stone-200 pt-4">
              <div>
                <p className="text-xs font-semibold text-stone-700">DESCRIPTION</p>
                <p className="mt-1 text-sm text-stone-600">{selectedService.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                {selectedService.price && (
                  <div>
                    <p className="text-xs font-semibold text-stone-700">PRIX</p>
                    <p className="mt-1 font-medium text-stone-900">{selectedService.price} CFA</p>
                  </div>
                )}
                {selectedService.priceMin && selectedService.priceMax && (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-stone-700">PRIX MIN</p>
                      <p className="mt-1 font-medium text-stone-900">{selectedService.priceMin} CFA</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-700">PRIX MAX</p>
                      <p className="mt-1 font-medium text-stone-900">{selectedService.priceMax} CFA</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="text-xs font-semibold text-stone-700">DÉLAI ESTIMÉ</p>
                  <p className="mt-1 font-medium text-stone-900">{selectedService.estimatedDays}j</p>
                </div>
              </div>

              {selectedService.tags && selectedService.tags.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-700">TAGS</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedService.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedService.fileUrls && selectedService.fileUrls.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-stone-700">DOCUMENTS & EXEMPLES JOINTS ({selectedService.fileUrls.length})</p>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {selectedService.fileUrls.map((url, i) => {
                      const fullUrl = url.startsWith('http') ? url : `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}${url}`;
                      const isImg = url.match(/\.(jpg|jpeg|png|webp|gif)$/i);
                      return (
                        <div key={i} className="flex flex-col items-center rounded-md border border-stone-200 bg-stone-50 p-2 text-center">
                          {isImg ? (
                            <img src={fullUrl} alt={`Preuve ${i + 1}`} className="h-20 w-full object-cover rounded mb-2" />
                          ) : (
                            <div className="flex h-20 w-full items-center justify-center text-3xl text-stone-400">📄</div>
                          )}
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
                          >
                            Ouvrir le fichier ↗
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedService.validationFeedback && (
                <div className="rounded-md bg-amber-50 p-3">
                  <p className="text-xs font-semibold text-amber-700">FEEDBACK PRÉCÉDENT</p>
                  <p className="mt-1 text-sm text-amber-900">{selectedService.validationFeedback}</p>
                </div>
              )}
            </div>

            {/* Action Form */}
            {!action && (
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <button
                  onClick={() => setAction('approve')}
                  className="w-full rounded-md bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-700"
                >
                  ✓ Approuver le service
                </button>
                <button
                  onClick={() => setAction('revise')}
                  className="w-full rounded-md bg-orange-600 px-4 py-2 font-medium text-white hover:bg-orange-700"
                >
                  🔄 Demander une révision (48h)
                </button>
                <button
                  onClick={() => setAction('reject')}
                  className="w-full rounded-md bg-red-600 px-4 py-2 font-medium text-white hover:bg-red-700"
                >
                  ✕ Refuser le service
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full rounded-md bg-stone-200 px-4 py-2 font-medium text-stone-900 hover:bg-stone-300"
                >
                  Fermer
                </button>
              </div>
            )}

            {/* Feedback Form */}
            {action && (
              <div className="space-y-3 border-t border-stone-200 pt-4">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder={
                    action === 'approve'
                      ? 'Aucun feedback requis pour l\'approbation'
                      : action === 'revise'
                      ? 'Décrivez les modifications demandées (délai 48h)...'
                      : 'Expliquez pourquoi vous rejetez ce service...'
                  }
                  disabled={action === 'approve'}
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm disabled:bg-stone-50"
                  rows={4}
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      if (action === 'approve') handleApproveService();
                      else if (action === 'reject') handleRejectService();
                      else handleRequestRevision();
                    }}
                    disabled={submitting || (action !== 'approve' && !feedback.trim())}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-stone-300"
                  >
                    {submitting ? 'Traitement...' : 'Confirmer'}
                  </button>
                  <button
                    onClick={() => setAction(null)}
                    disabled={submitting}
                    className="flex-1 rounded-md bg-stone-200 px-4 py-2 font-medium text-stone-900 hover:bg-stone-300"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

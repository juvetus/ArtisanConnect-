'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';
import type { Report, ReportReason, ReportStatus } from '@/lib/types';
import { Pagination } from './Pagination';

const REASON_LABELS: Record<ReportReason, string> = {
  fraud: 'Arnaque / fraude',
  counterfeit: 'Contrefaçon',
  inappropriate: 'Contenu inapproprié',
  spam: 'Spam',
  wrong_info: 'Informations trompeuses',
  other: 'Autre',
};

const STATUS_LABELS: Record<ReportStatus, string> = {
  open: 'À traiter',
  reviewing: 'En cours d’examen',
  resolved: 'Traité',
  dismissed: 'Classé sans suite',
};

const TARGET_LINK: Record<Report['targetType'], (id: string) => string | null> = {
  listing: (id) => `/listings/${id}`,
  shop: (id) => `/shop/${id}`,
  user: () => null,
  review: () => null,
};

export function ModerationAdmin() {
  const [statusFilter, setStatusFilter] = useState<ReportStatus | 'all'>('open');
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const { data: reports, isLoading, mutate } = useSWR(
    ['admin-reports', statusFilter],
    ([, status]) => api.adminReports(status === 'all' ? undefined : (status as ReportStatus)),
  );

  const moderate = async (report: Report, status: ReportStatus) => {
    setError('');
    const notes = status === 'resolved' || status === 'dismissed'
      ? prompt('Note de modération (visible par l’équipe uniquement) :') ?? undefined
      : undefined;
    try {
      await api.adminModerateReport(report.id, status, notes);
      await mutate();
    } catch (moderationError) {
      setError(moderationError instanceof ApiError ? moderationError.message : 'Action de modération impossible.');
    }
  };

  return (
    <section className="space-y-4 rounded-lg border border-stone-200 bg-white p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Signalements</h2>
          <p className="mt-1 text-sm text-stone-600">Annonces, boutiques et vendeurs signalés par les utilisateurs.</p>
        </div>
        <label className="text-sm font-medium text-stone-700">
          Statut
          <select
            value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value as ReportStatus | 'all'); setPage(0); }}
            className="ml-2 rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
          >
            <option value="open">À traiter</option>
            <option value="reviewing">En cours</option>
            <option value="resolved">Traités</option>
            <option value="dismissed">Classés</option>
            <option value="all">Tous</option>
          </select>
        </label>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-stone-600">Chargement des signalements…</p>
      ) : !reports?.length ? (
        <p className="rounded-md border border-stone-200 bg-stone-50 p-6 text-sm text-stone-600">
          Aucun signalement pour ce filtre.
        </p>
      ) : (
        <ul className="space-y-3">
          {reports.slice(page * 10, (page + 1) * 10).map((report) => {
            const href = TARGET_LINK[report.targetType](report.targetId);
            return (
              <li key={report.id} className="rounded-lg border border-stone-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium capitalize text-stone-700">
                        {report.targetType}
                      </span>
                      <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        {REASON_LABELS[report.reason]}
                      </span>
                      <span className="text-xs text-stone-500">{STATUS_LABELS[report.status]}</span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">{report.details || 'Aucune précision fournie.'}</p>
                    <p className="mt-1 text-xs text-stone-500">
                      Signalé par {report.reporter?.name ?? report.reporter?.email ?? 'un utilisateur'} ·{' '}
                      {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                    {report.moderatorNotes ? (
                      <p className="mt-1 text-xs text-stone-500">Note : {report.moderatorNotes}</p>
                    ) : null}
                    {href ? (
                      <a href={href} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm text-amber-700 underline">
                        Ouvrir le contenu signalé
                      </a>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {report.status === 'open' ? (
                      <button
                        onClick={() => void moderate(report, 'reviewing')}
                        className="rounded-md bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                      >
                        Prendre en charge
                      </button>
                    ) : null}
                    {report.status !== 'resolved' ? (
                      <button
                        onClick={() => void moderate(report, 'resolved')}
                        className="rounded-md bg-green-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-800"
                      >
                        Marquer traité
                      </button>
                    ) : null}
                    {report.status !== 'dismissed' ? (
                      <button
                        onClick={() => void moderate(report, 'dismissed')}
                        className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-50"
                      >
                        Classer sans suite
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {reports && reports.length > 10 ? (
        <Pagination page={page} hasPrevious={page > 0} hasNext={(page + 1) * 10 < reports.length} onPrevious={() => setPage((current) => Math.max(0, current - 1))} onNext={() => setPage((current) => current + 1)} />
      ) : null}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { ReportReason, ReportTargetType } from '@/lib/types';

const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'fraud', label: 'Arnaque ou tentative de fraude' },
  { value: 'counterfeit', label: 'Contrefaçon ou produit non conforme' },
  { value: 'inappropriate', label: 'Contenu choquant ou inapproprié' },
  { value: 'spam', label: 'Spam ou publicité répétée' },
  { value: 'wrong_info', label: 'Informations fausses ou trompeuses' },
  { value: 'other', label: 'Autre motif' },
];

export function ReportButton({
  targetType,
  targetId,
  label = 'Signaler',
}: {
  targetType: ReportTargetType;
  targetId: string;
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('fraud');
  const [details, setDetails] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    setNotice('');
    try {
      await api.createReport({ targetType, targetId, reason, details });
      setOpen(false);
      setDetails('');
      setNotice('Signalement transmis à notre équipe de modération. Merci.');
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Le signalement n’a pas pu être envoyé.');
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mt-3">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-red-700"
        >
          ⚠ {label}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold text-stone-900">Signaler ce contenu</p>
          <label className="block text-sm text-stone-700">
            Motif
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value as ReportReason)}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            >
              {REASONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-stone-700">
            Précisions
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Expliquez ce que vous avez constaté."
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={sending}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
            >
              {sending ? 'Envoi…' : 'Envoyer le signalement'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
      {notice ? <p className="mt-2 text-sm text-stone-600">{notice}</p> : null}
    </div>
  );
}

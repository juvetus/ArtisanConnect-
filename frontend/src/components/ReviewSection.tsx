'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { api, ApiError } from '@/lib/api';

export function ReviewSection({ orderId }: { orderId: string }) {
  const { data: review, mutate } = useSWR(['review', orderId], ([, id]) => api.orderReview(id));

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createReview({ orderId, rating, comment });
      setOpen(false);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "L'avis n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  if (review) {
    return (
      <p className="mt-2 text-sm text-stone-600">
        Votre avis : {'★'.repeat(review.rating)}
        {'☆'.repeat(5 - review.rating)}
        {review.comment && ` — « ${review.comment} »`}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-2 rounded-md border border-amber-700 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
      >
        Laisser un avis
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3 rounded-md border border-stone-200 p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            aria-label={`${value} étoile${value > 1 ? 's' : ''}`}
            className={`text-2xl leading-none ${value <= rating ? 'text-amber-500' : 'text-stone-300'}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Votre commentaire (facultatif)"
        className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm outline-none focus:border-amber-600"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-amber-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {saving ? 'Envoi…' : 'Publier'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-4 py-1.5 text-sm text-stone-600 hover:bg-stone-100"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

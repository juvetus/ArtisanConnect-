'use client';

import { useLanguage } from '@/lib/language-context';

interface PaginationProps {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export function Pagination({ page, hasPrevious, hasNext, onPrevious, onNext }: PaginationProps) {
  const { t } = useLanguage();

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-3 pt-3">
      <button
        type="button"
        disabled={!hasPrevious}
        onClick={onPrevious}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('action_previous')}
      </button>
      <span className="min-w-20 text-center text-sm text-stone-600">
        {t('page_label', { page: page + 1 })}
      </span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={onNext}
        className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {t('action_next')}
      </button>
    </nav>
  );
}

'use client';

import { useState, type ReactNode } from 'react';

export function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `section-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-stone-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 p-6 text-left transition hover:bg-stone-50"
      >
        <span>
          <span className="block text-lg font-semibold text-stone-900">{title}</span>
          {subtitle ? <span className="mt-1 block text-xs text-stone-500">{subtitle}</span> : null}
        </span>
        <span aria-hidden className={`text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open ? (
        <div id={panelId} className="border-t border-stone-100 px-6 pb-6 pt-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

'use client';

import { useId, useState } from 'react';
import { useLanguage } from '@/lib/language-context';
import { opportunityTradeLabel, sortOpportunityTrades } from '@/lib/opportunities';

export function OpportunityTradePicker({ trades, value, onChange, disabled = false }: {
  trades: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  const en = language === 'en';
  const searchId = useId();
  const [query, setQuery] = useState('');
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase(language);
  const search = normalize(query.trim());
  const filteredTrades = sortOpportunityTrades(trades, language)
    .filter((trade) => normalize(opportunityTradeLabel(trade, language)).includes(search));
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{en ? 'Trades concerned' : 'Métiers concernés'}</legend>
      <label htmlFor={searchId} className="mb-1 block text-sm">{en ? 'Search trades' : 'Rechercher un métier'}</label>
      <input
        id={searchId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={en ? 'E.g. digital, livestock…' : 'Ex. : numérique, élevage…'}
        className="mb-2 w-full rounded-md border border-stone-300 px-3 py-2 outline-none focus:border-amber-600"
      />
      <p role="status" className="mb-2 text-xs text-stone-600">
        {en ? `${filteredTrades.length} shown · ${value.length} selected` : `${filteredTrades.length} affichés · ${value.length} sélectionnés`}
      </p>
      <div className="grid max-h-60 gap-2 overflow-auto rounded-md border border-stone-200 p-3 sm:grid-cols-2">
        {filteredTrades.map((trade) => (
          <label key={trade} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.includes(trade)} onChange={(event) => onChange(event.target.checked ? [...value, trade] : value.filter((item) => item !== trade))} />
            {opportunityTradeLabel(trade, language)}
          </label>
        ))}
        {!filteredTrades.length && <p className="text-sm text-stone-600 sm:col-span-2">{en ? 'No matching trade.' : 'Aucun métier correspondant.'}</p>}
      </div>
    </fieldset>
  );
}

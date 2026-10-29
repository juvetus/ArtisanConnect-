'use client';

import { useLanguage } from '@/lib/language-context';
import { opportunityTradeLabel } from '@/lib/opportunities';

export function OpportunityTradePicker({ trades, value, onChange, disabled = false }: {
  trades: string[];
  value: string[];
  onChange: (value: string[]) => void;
  disabled?: boolean;
}) {
  const { language } = useLanguage();
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-medium">{language === 'en' ? 'Trades concerned' : 'Métiers concernés'}</legend>
      <div className="grid max-h-60 gap-2 overflow-auto rounded-md border border-stone-200 p-3 sm:grid-cols-2">
        {trades.map((trade) => (
          <label key={trade} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={value.includes(trade)} onChange={(event) => onChange(event.target.checked ? [...value, trade] : value.filter((item) => item !== trade))} />
            {opportunityTradeLabel(trade, language)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

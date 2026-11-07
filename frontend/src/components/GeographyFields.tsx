'use client';

import { useId } from 'react';
import { CITIES, DISTRICTS, NEIGHBORHOODS, slugify } from '@/lib/locations';

export interface GeographyValue {
  city: string;
  district: string;
  neighborhood: string;
}

export function GeographyFields({ value, onChange, language, requiredCity = false, disabled = false }: {
  value: GeographyValue;
  onChange: (value: GeographyValue) => void;
  language: 'fr' | 'en';
  requiredCity?: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const english = language === 'en';
  const cityKey = slugify(value.city);
  const suggestions = { city: CITIES, district: DISTRICTS[cityKey] ?? [], neighborhood: NEIGHBORHOODS[cityKey] ?? [] };
  return (
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-medium">{english ? 'Location' : 'Localisation'}</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        {([
          ['city', english ? 'City' : 'Ville'],
          ['district', english ? 'District' : 'Arrondissement'],
          ['neighborhood', english ? 'Neighborhood' : 'Quartier'],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`${id}-${key}`} className="block text-sm font-medium">{label}{key === 'city' && requiredCity ? ' *' : ''}</label>
            <input id={`${id}-${key}`} list={`${id}-${key}-suggestions`} required={key === 'city' && requiredCity} maxLength={150} value={value[key]} onChange={(event) => onChange(key === 'city' ? { city: event.target.value, district: '', neighborhood: '' } : { ...value, [key]: event.target.value })} className="field mt-1" />
            <datalist id={`${id}-${key}-suggestions`}>{suggestions[key].map((label) => <option key={label} value={label} />)}</datalist>
          </div>
        ))}
      </div>
      <p className="text-xs text-stone-500">{english ? 'Non-exhaustive suggestions. You can enter another location. Neighborhoods are suggested by city, not assigned to districts.' : 'Suggestions non exhaustives. Vous pouvez saisir un autre lieu. Les quartiers sont proposés par ville, sans rattachement automatique à un arrondissement.'}</p>
    </fieldset>
  );
}

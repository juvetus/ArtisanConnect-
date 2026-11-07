import { BadRequestException } from '@nestjs/common';

export interface InstitutionGeography {
  city?: string;
  district?: string;
  neighborhood?: string;
}

export function normalizeGeography(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function validateGeography(input: InstitutionGeography): InstitutionGeography {
  const result: InstitutionGeography = {};
  for (const key of ['city', 'district', 'neighborhood'] as const) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.length > 150 || [...value].some((character) => character.charCodeAt(0) < 32)) {
      throw new BadRequestException(`Filtre ${key} invalide (150 caracteres maximum)`);
    }
    if (value.trim()) result[key] = value.trim();
  }
  return result;
}

export function normalizedGeographySql(column: string): string {
  return `regexp_replace(btrim(translate(lower(${column}), '\u00e0\u00e1\u00e2\u00e3\u00e4\u00e5\u00e7\u00e8\u00e9\u00ea\u00eb\u00ec\u00ed\u00ee\u00ef\u00f1\u00f2\u00f3\u00f4\u00f5\u00f6\u00f9\u00fa\u00fb\u00fc\u00fd\u00ff', 'aaaaaaceeeeiiiinooooouuuuyy')), '\\s+', ' ', 'g')`;
}

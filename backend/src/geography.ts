import { BadRequestException } from '@nestjs/common';

export interface Geography {
  city?: string | null;
  district?: string | null;
  neighborhood?: string | null;
}

export function validateProfileGeography(input: Geography): Geography {
  const result: Geography = {};
  for (const field of ['city', 'district', 'neighborhood'] as const) {
    const value = input[field];
    if (value === undefined) continue;
    if (value === null) { result[field] = null; continue; }
    if (typeof value !== 'string' || value.length > 150 || [...value].some((character) => character.charCodeAt(0) < 32)) {
      throw new BadRequestException(`Localisation ${field} invalide (150 caracteres maximum)`);
    }
    result[field] = value.trim() || null;
  }
  return result;
}

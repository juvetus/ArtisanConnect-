import { BadRequestException } from '@nestjs/common';
import type { User } from '../../entities/user.entity.js';

export const OPPORTUNITY_TRADES = [
  'menuiserie', 'maconnerie', 'plomberie', 'electricite', 'peinture', 'renovation',
  'soudure', 'aluminium_vitrerie', 'serrurerie', 'solaire', 'forage', 'froid',
  'couture', 'tissage', 'ameublement', 'traiteur', 'nettoyage', 'jardinage',
  'impression', 'graphisme', 'photographie', 'evenementiel', 'sonorisation',
  'transport', 'agriculture', 'transformation_agro', 'maintenance_groupes_electrogenes',
] as const;

export function isFormalized(user: Pick<User, 'role' | 'isActive' | 'hasRccm' | 'hasNiu' | 'hasProfessionalArtisanCard'>, approved: boolean): boolean {
  return user.role === 'artisan' && user.isActive && (approved || (
    user.hasRccm === true && user.hasNiu === true && user.hasProfessionalArtisanCard === true
  ));
}

export function validateTrades(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > OPPORTUNITY_TRADES.length ||
    value.some((trade) => typeof trade !== 'string' || !OPPORTUNITY_TRADES.some((allowed) => allowed === trade))) {
    throw new BadRequestException('Métiers invalides');
  }
  return [...new Set<string>(value)];
}

export function validSourceUrl(value: unknown): string {
  if (typeof value !== 'string' || value.length > 2000) throw new BadRequestException('Lien source invalide');
  let url: URL;
  try { url = new URL(value); } catch { throw new BadRequestException('Lien source invalide'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new BadRequestException('Un lien HTTPS public est requis');
  return url.href;
}

export function requiredText(value: unknown, label: string, max = 500): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new BadRequestException(`${label} requis (${max} caractères maximum)`);
  return value.trim();
}

export function parseDeadline(value: unknown): Date {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new BadRequestException('Échéance ISO avec fuseau horaire requise');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) throw new BadRequestException('Une échéance future est requise');
  return date;
}

import { Shop } from '../../entities/shop.entity.js';

/** Niveaux de vérification progressifs : aucun badge n'est affiché sans procédure réelle. */
export type VerificationLevel = 'none' | 'phone' | 'profile' | 'identity' | 'recommended';

export interface VerificationState {
  level: VerificationLevel;
  steps: { phone: boolean; profile: boolean; identity: boolean; recommended: boolean };
}

/** Seuils du niveau « Artisan recommandé ». */
export const RECOMMENDED_MIN_SALES = 5;
export const RECOMMENDED_MIN_REVIEWS = 3;
export const RECOMMENDED_MIN_RATING = 4.5;

export function computeVerification(
  shop: Pick<Shop, 'type' | 'status' | 'kycDocuments' | 'identityVerified' | 'successfulSales'>,
  context: { phoneVerified: boolean; rating: { average: number | null; count: number } },
): VerificationState {
  const provided = new Set((shop.kycDocuments ?? []).map((doc) => doc.label));
  const kycComplete = Shop.requiredDocuments(shop.type).every((label) => provided.has(label));

  const phone = Boolean(context.phoneVerified);
  const profile = shop.status === 'active' && kycComplete;
  const identity = Boolean(shop.identityVerified);
  const recommended =
    identity &&
    shop.successfulSales >= RECOMMENDED_MIN_SALES &&
    context.rating.count >= RECOMMENDED_MIN_REVIEWS &&
    (context.rating.average ?? 0) >= RECOMMENDED_MIN_RATING;

  const level: VerificationLevel = recommended
    ? 'recommended'
    : identity
      ? 'identity'
      : profile
        ? 'profile'
        : phone
          ? 'phone'
          : 'none';

  return { level, steps: { phone, profile, identity, recommended } };
}

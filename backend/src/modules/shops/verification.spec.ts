import { describe, it, expect } from 'vitest';
import { computeVerification } from './verification.js';
import { Shop } from '../../entities/shop.entity.js';

type VerifiableShop = Pick<Shop, 'type' | 'status' | 'kycDocuments' | 'identityVerified' | 'successfulSales'>;

const completeKyc = Shop.requiredDocuments('artisan').map((label) => ({ label, url: 'https://example.test/doc' }));

const artisanShop = (overrides: Partial<VerifiableShop> = {}): VerifiableShop => ({
  type: 'artisan',
  status: 'active',
  kycDocuments: completeKyc,
  identityVerified: false,
  successfulSales: 0,
  ...overrides,
});

const noRating = { average: null, count: 0 };

describe('computeVerification', () => {
  it('ne donne aucun badge sans téléphone vérifié ni KYC complet', () => {
    const result = computeVerification(artisanShop({ status: 'pending', kycDocuments: [] }), {
      phoneVerified: false,
      rating: noRating,
    });
    expect(result.level).toBe('none');
  });

  it('retient « téléphone vérifié » quand seul le numéro est confirmé', () => {
    const result = computeVerification(artisanShop({ status: 'pending', kycDocuments: [] }), {
      phoneVerified: true,
      rating: noRating,
    });
    expect(result.level).toBe('phone');
  });

  it('passe à « profil contrôlé » quand la boutique est active avec un KYC complet', () => {
    const result = computeVerification(artisanShop(), { phoneVerified: true, rating: noRating });
    expect(result.level).toBe('profile');
  });

  it('passe à « identité vérifiée » seulement après contrôle administrateur', () => {
    const result = computeVerification(artisanShop({ identityVerified: true }), {
      phoneVerified: true,
      rating: noRating,
    });
    expect(result.level).toBe('identity');
  });

  it('exige ventes et avis pour « artisan recommandé »', () => {
    const context = { phoneVerified: true, rating: { average: 4.8, count: 4 } };
    expect(computeVerification(artisanShop({ identityVerified: true, successfulSales: 4 }), context).level).toBe('identity');
    expect(computeVerification(artisanShop({ identityVerified: true, successfulSales: 5 }), context).level).toBe('recommended');
  });
});

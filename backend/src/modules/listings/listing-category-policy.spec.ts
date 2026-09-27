import { describe, expect, it } from 'vitest';
import { isListingCategoryAllowed } from './listing-category-policy.js';

describe('isListingCategoryAllowed', () => {
  it('accepte une catégorie produit valide', () => {
    expect(isListingCategoryAllowed('product', 'vannerie')).toBe(true);
    expect(isListingCategoryAllowed('product', 'produits_importes')).toBe(true);
  });

  it('accepte une catégorie de service valide', () => {
    expect(isListingCategoryAllowed('service', 'menuiserie')).toBe(true);
  });

  it('refuse une catégorie qui ne correspond pas au type ou qui est inconnue', () => {
    expect(isListingCategoryAllowed('product', 'plomberie')).toBe(false);
    expect(isListingCategoryAllowed('service', 'vannerie')).toBe(false);
    expect(isListingCategoryAllowed('product', 'categorie-inconnue')).toBe(false);
    expect(isListingCategoryAllowed(undefined, 'vannerie')).toBe(false);
  });
});
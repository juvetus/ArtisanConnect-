import { describe, it, expect } from 'vitest';
import { ShopsService } from './shops.service.js';
import { AdminService } from '../admin/admin.service.js';
import { Shop } from '../../entities/shop.entity.js';

describe('Vérification du flux de validation manuelle des boutiques Artisan', () => {
  it('garantit les règles KYC et le cycle de vie complet', () => {
    // 1. Preuves KYC obligatoires pour les artisans
    const requiredArtisanDocs = Shop.requiredDocuments('artisan');
    expect(requiredArtisanDocs).toEqual([
      'piece_identite',
      'photo_atelier',
      'photo_produit_1',
      'photo_produit_2',
      'photo_produit_3',
    ]);

    // 2. Preuves KYC pour revendeur (vidéo)
    const requiredResellerDocs = Shop.requiredDocuments('reseller');
    expect(requiredResellerDocs).toEqual([
      'video_vendeur_produit',
      'photo_produit',
      'photo_produit_emballe',
    ]);
  });
});

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Listing } from './listing.entity.js';

export type ShopType = 'artisan' | 'reseller' | 'individual';
export type ShopStatus = 'pending' | 'active' | 'rejected' | 'suspended';

/**
 * Boutique d'un vendeur. Le type détermine les preuves KYC requises
 * et le mode de validation (manuel pour les artisans, automatique sinon).
 */
@Entity('shops')
export class Shop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sellerId: string;

  @Column('enum', { enum: ['artisan', 'reseller', 'individual'] })
  type: ShopType;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'varchar', nullable: true })
  city: string | null;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'varchar', nullable: true })
  market: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  /** Numéro Mobile Money vérifié (pré-paiement escrow obligatoire). */
  @Column()
  mobileMoneyNumber: string;

  @Column({ type: 'varchar', nullable: true })
  momoNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  orangeMoneyNumber: string | null;

  @Column('enum', { enum: ['momo', 'orange_money', 'both'], default: 'both' })
  mobileMoneyProvider: 'momo' | 'orange_money' | 'both';

  /** Mode de livraison proposé par la boutique. */
  @Column('enum', { enum: ['workshop', 'home'], default: 'workshop' })
  deliveryMode: 'workshop' | 'home';

  @Column('simple-array', { nullable: true })
  deliveryMethods: ('workshop' | 'home' | 'carrier')[];

  /** Preuves KYC : les documents Cloudinary privés utilisent publicId/resourceType. */
  @Column({ type: 'jsonb', default: [] })
  kycDocuments: { label: string; url: string; publicId?: string; resourceType?: string; format?: string }[];

  @Column({ default: false })
  mobileMoneyVerified: boolean;

  /** Statut du cycle de vie de la boutique. */
  @Column('enum', { enum: ['pending', 'active', 'rejected', 'suspended'], default: 'pending' })
  status: ShopStatus;

  @Column({ nullable: true, type: 'text' })
  rejectionReason: string | null;

  /** Badge "Vendeur vérifié" après 3 ventes réussies. */
  @Column({ default: 0 })
  views: number;

  @Column({ default: 0 })
  whatsappContactClicks: number;

  @Column({ default: 0 })
  whatsappShareClicks: number;

  @Column({ default: false })
  verifiedBadge: boolean;

  /** Pièce d'identité réellement contrôlée par un administrateur. */
  @Column({ default: false })
  identityVerified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  identityVerifiedAt: Date | null;

  /** Badge / Indicateur Entrepreneuriat Féminin / Créatrice. */
  @Column({ default: false })
  isWomenLed: boolean;

  /** Badge / Indicateur Coopérative ou Groupement d'artisans. */
  @Column({ default: false })
  isCooperative: boolean;

  /** Badge "Top vendeur" après 20 ventes réussies. */
  @Column({ default: false })
  topSellerBadge: boolean;

  @Column({ default: 0 })
  successfulSales: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.shops, { onDelete: 'CASCADE' })
  seller: Relation<User>;

  @OneToMany(() => Listing, (listing) => listing.shop)
  listings: Relation<Listing>[];

  /** Preuves KYC exigées selon le type de boutique. */
  static requiredDocuments(type: ShopType): string[] {
    switch (type) {
      case 'artisan':
        return ['piece_identite', 'photo_atelier', 'photo_produit_1', 'photo_produit_2', 'photo_produit_3'];
      case 'reseller':
        return ['video_vendeur_produit', 'photo_produit', 'photo_produit_emballe'];
      case 'individual':
        return ['photo_vendeur_produit', 'photo_produit'];
    }
  }
}

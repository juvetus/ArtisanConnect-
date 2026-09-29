import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Listing } from './listing.entity.js';
import { User } from './user.entity.js';

export type ListingOfferStatus = 'pending' | 'accepted' | 'rejected';
export type ListingOfferProposer = 'buyer' | 'seller';

export interface ListingOfferNegotiationEntry {
  proposedBy: ListingOfferProposer;
  unitPrice: number | string;
  message: string | null;
  createdAt: string;
}

@Entity('listing_offers')
export class ListingOffer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buyerId: string;

  @Column()
  sellerId: string;

  @Column()
  listingId: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 0 })
  offeredUnitPrice: number;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ type: 'varchar', default: 'pending' })
  status: ListingOfferStatus;

  @Column({ type: 'varchar', default: 'buyer' })
  lastProposedBy: ListingOfferProposer;

  @Column({ type: 'jsonb', default: [] })
  negotiationHistory: ListingOfferNegotiationEntry[];

  @Column({ type: 'varchar' })
  paymentMethod: 'cash' | 'momo' | 'orange_money';

  @Column({ type: 'varchar' })
  deliveryMethod: 'workshop' | 'home' | 'carrier';

  @Column({ type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'uuid', nullable: true })
  orderId: string | null;

  @ManyToOne(() => User, { nullable: false })
  buyer: Relation<User>;

  @ManyToOne(() => User, { nullable: false })
  seller: Relation<User>;

  @ManyToOne(() => Listing, { nullable: false })
  listing: Relation<Listing>;

  @CreateDateColumn()
  createdAt: Date;
}

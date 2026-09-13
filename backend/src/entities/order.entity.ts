import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Listing } from './listing.entity.js';
import { Payment } from './payment.entity.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  buyerId: string;

  @Column()
  sellerId: string;

  @Column()
  listingId: string;

  @Column({ default: 1 })
  quantity: number;

  @Column('decimal', { precision: 12, scale: 0 })
  totalPrice: number;

  @Column('decimal', { precision: 12, scale: 0 })
  platformFee: number;

  @Column('enum', { enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' })
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';

  @Column('enum', { enum: ['cash', 'momo', 'orange_money', 'card'], default: 'cash' })
  paymentMethod: 'cash' | 'momo' | 'orange_money' | 'card';

  @Column('enum', { enum: ['workshop', 'home', 'carrier'], default: 'workshop' })
  deliveryMethod: 'workshop' | 'home' | 'carrier';

  @Column({ type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'float', nullable: true })
  deliveryLatitude: number | null;

  @Column({ type: 'float', nullable: true })
  deliveryLongitude: number | null;

  // --- Workflow escrow ---
  /** Le vendeur a confirmé la disponibilité du produit. */
  @Column({ default: false })
  sellerConfirmedAvailability: boolean;

  /** Le transporteur a récupéré le produit. */
  @Column({ default: false })
  carrierPickedUp: boolean;

  /** Le transporteur a vérifié la conformité du produit. */
  @Column({ default: false })
  carrierVerified: boolean;

  /** Le client a confirmé la réception. */
  @Column({ default: false })
  buyerConfirmedReception: boolean;

  /** Motif d'annulation avec remboursement automatique. */
  @Column({ nullable: true, type: 'text' })
  cancellationReason: string;

  /** Identifiant du transporteur (utilisateur rôle transporteur ou admin). */
  @Column({ nullable: true })
  carrierId: string;

  @Column({ type: 'varchar', nullable: true })
  deliveryCarrier: string | null;

  @Column({ type: 'varchar', nullable: true })
  deliveryTrackingId: string | null;

  @Column('enum', { enum: ['pending', 'assigned', 'picking_up', 'in_transit', 'delivered', 'cancelled'], default: 'pending' })
  deliveryStatus: 'pending' | 'assigned' | 'picking_up' | 'in_transit' | 'delivered' | 'cancelled';

  @Column({ type: 'text', nullable: true })
  deliveryTrackingUrl: string | null;

  @Column('decimal', { precision: 12, scale: 0, nullable: true })
  deliveryCost: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.purchasedOrders)
  buyer: Relation<User>;

  @ManyToOne(() => User, (user) => user.soldOrders)
  seller: Relation<User>;

  @ManyToOne(() => Listing, (listing) => listing.orders)
  listing: Relation<Listing>;

  @OneToOne(() => Payment, (payment) => payment.order)
  payment: Relation<Payment>;
}

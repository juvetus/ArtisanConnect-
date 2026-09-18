import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Order } from './order.entity.js';
import { Shop } from './shop.entity.js';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column('enum', { enum: ['product', 'service'] })
  type: 'product' | 'service';

  @Column('decimal', { precision: 12, scale: 0 })
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('simple-array', { nullable: true })
  imageUrls: string[];

  /** Boutique à laquelle rattacher l'annonce (optionnel en phase de migration). */
  @Column({ nullable: true })
  shopId: string;

  @ManyToOne(() => Shop, (shop) => shop.listings, { nullable: true, onDelete: 'SET NULL' })
  shop: Relation<Shop>;

  @Column('enum', { enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Column({ default: 0 })
  stock: number; // Pour les produits

  @Column('simple-array', { nullable: true })
  acceptedPaymentMethods: ('cash' | 'momo' | 'orange_money')[];

  @Column('simple-array', { nullable: true })
  deliveryMethods: ('workshop' | 'home' | 'carrier')[];

  @Column({ nullable: true })
  availability: string; // Pour les services

  /** Mise en avant payante : l'annonce reste affichée comme « Sponsorisé » jusqu'à cette date. */
  @Column({ type: 'timestamp', nullable: true })
  sponsoredUntil: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.listings, { onDelete: 'CASCADE' })
  seller: Relation<User>;

  @Column()
  sellerId: string;

  @OneToMany(() => Order, (order) => order.listing)
  orders: Relation<Order>[];
}

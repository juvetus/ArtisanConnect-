import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { Listing } from './listing.entity.js';
import { Order } from './order.entity.js';
import { Review } from './review.entity.js';
import { Message } from './message.entity.js';
import { Shop } from './shop.entity.js';
import { Notification } from './notification.entity.js';
import { Subscription } from './subscription.entity.js';
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column('enum', { enum: ['artisan', 'client', 'institution', 'admin', 'editor', 'viewer'], default: 'client' })
  role: 'artisan' | 'client' | 'institution' | 'admin' | 'editor' | 'viewer';

  @Column({ nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  location: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  gender: 'female' | 'male' | 'cooperative' | 'other' | null;

  @Column({ default: false })
  verifiedEmail: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  emailVerificationExpires: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true, select: false })
  passwordResetExpires: Date | null;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => Listing, (listing) => listing.seller)
  listings: Relation<Listing>[];

  @OneToMany(() => Order, (order) => order.buyer)
  purchasedOrders: Relation<Order>[];

  @OneToMany(() => Order, (order) => order.seller)
  soldOrders: Relation<Order>[];

  @OneToMany(() => Review, (review) => review.reviewer)
  reviewsGiven: Relation<Review>[];

  @OneToMany(() => Review, (review) => review.recipient)
  reviewsReceived: Relation<Review>[];

  @OneToMany(() => Message, (message) => message.sender)
  sentMessages: Relation<Message>[];

  @OneToMany(() => Message, (message) => message.recipient)
  receivedMessages: Relation<Message>[];

  @OneToMany(() => Shop, (shop) => shop.seller)
  shops: Relation<Shop>[];

  @OneToMany(() => Notification, (notification) => notification.recipient)
  notifications: Relation<Notification>[];

  @OneToMany(() => Subscription, (subscription) => subscription.user)
  subscriptions: Relation<Subscription>[];
}

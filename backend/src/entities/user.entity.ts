import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { Listing } from './listing.entity.js';
import { Order } from './order.entity.js';
import { Review } from './review.entity.js';
import { Message } from './message.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column('enum', { enum: ['artisan', 'client', 'admin'], default: 'client' })
  role: 'artisan' | 'client' | 'admin';

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

  @Column({ default: false })
  verifiedEmail: boolean;

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
}

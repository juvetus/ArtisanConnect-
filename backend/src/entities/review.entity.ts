import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Order } from './order.entity.js';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  reviewerId: string;

  @Column()
  recipientId: string;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ default: true })
  verified: boolean; // Après commande complétée

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Order)
  order: Relation<Order>;

  @ManyToOne(() => User, (user) => user.reviewsGiven)
  reviewer: Relation<User>;

  @ManyToOne(() => User, (user) => user.reviewsReceived)
  recipient: Relation<User>;
}

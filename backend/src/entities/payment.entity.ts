import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Order } from './order.entity.js';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column('decimal', { precision: 12, scale: 0 })
  amount: number;

  @Column('enum', { enum: ['cash', 'momo', 'orange_money', 'stripe'], default: 'cash' })
  method: 'cash' | 'momo' | 'orange_money' | 'stripe';

  @Column('enum', { enum: ['pending', 'confirmed', 'captured', 'refunded'], default: 'pending' })
  status: 'pending' | 'confirmed' | 'captured' | 'refunded';

  @Column({ nullable: true })
  stripePaymentIntentId: string;

  @Column({ nullable: true })
  orangeMoneyTransactionId: string;

  @Column({ type: 'varchar', nullable: true })
  orangeMoneyPaymentToken: string | null;

  @Column({ type: 'varchar', nullable: true })
  orangeMoneyNotifToken: string | null;

  @Column({ type: 'text', nullable: true })
  orangeMoneyPaymentUrl: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  cashConfirmedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Order, (order) => order.payment)
  @JoinColumn()
  order: Relation<Order>;
}

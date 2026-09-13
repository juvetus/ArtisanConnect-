import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { SubscriptionPlan } from './subscription-plan.entity.js';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  planId: string;

  @Column('enum', { enum: ['pending', 'active', 'failed', 'cancelled'], default: 'pending' })
  status: 'pending' | 'active' | 'failed' | 'cancelled';

  @Column('decimal', { precision: 12, scale: 0, default: 0 })
  amount: number;

  @Column({ default: 'XAF' })
  currency: string;

  @Column({ type: 'timestamp', nullable: true })
  startDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextPaymentAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string | null;

  @Column({ default: 'momo' })
  provider: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.subscriptions)
  user: Relation<User>;

  @ManyToOne(() => SubscriptionPlan, (plan) => plan.subscriptions)
  plan: Relation<SubscriptionPlan>;
}

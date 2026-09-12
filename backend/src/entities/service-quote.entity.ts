import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { ServiceOrder } from './service-order.entity.js';

export type ServiceQuoteStatus = 'pending' | 'accepted' | 'rejected';

@Entity('service_quotes')
export class ServiceQuote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  artisanId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  proposedPrice: number;

  @Column()
  proposedDays: number;

  @Column({ type: 'text' })
  details: string;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'rejected'], default: 'pending' })
  status: ServiceQuoteStatus;

  @Column({ type: 'text', nullable: true })
  clientResponse: string | null;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ServiceOrder, { nullable: false })
  order: Relation<ServiceOrder>;

  @ManyToOne(() => User, { nullable: false })
  artisan: Relation<User>;
}

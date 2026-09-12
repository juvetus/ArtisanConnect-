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
import { Service } from './service.entity.js';

export type ServiceOrderStatus =
  | 'pending_admin_validation'
  | 'details_requested'
  | 'sent_to_artisan'
  | 'quote_pending'
  | 'accepted'
  | 'in_progress'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled'
  | 'rejected';

export type ServiceDeliveryMethod = 'home' | 'workshop' | 'carrier';

@Entity('service_orders')
export class ServiceOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column()
  artisanId: string;

  @Column()
  serviceId: string;

  @Column({ type: 'text' })
  projectObjective: string;

  @Column({ type: 'jsonb', default: {} })
  options: Record<string, unknown>;

  @Column({ type: 'text', nullable: true })
  inspirationLinks: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetMin: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  budgetMax: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  platformFee: number;

  @Column({ type: 'timestamp', nullable: true })
  requestedDate: Date | null;

  @Column({ type: 'enum', enum: ['home', 'workshop', 'carrier'], default: 'workshop' })
  deliveryMethod: ServiceDeliveryMethod;

  @Column({ type: 'text', nullable: true })
  deliveryAddress: string | null;

  @Column({ type: 'double precision', nullable: true })
  deliveryLatitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  deliveryLongitude: number | null;

  @Column('simple-array', { nullable: true })
  fileUrls: string[];

  @Column({ type: 'enum', enum: [
    'pending_admin_validation',
    'details_requested',
    'sent_to_artisan',
    'quote_pending',
    'accepted',
    'in_progress',
    'delivered',
    'completed',
    'disputed',
    'cancelled',
    'rejected',
  ], default: 'pending_admin_validation' })
  status: ServiceOrderStatus;

  @Column({ type: 'text', nullable: true })
  adminFeedback: string | null;

  @Column({ type: 'text', nullable: true })
  deliveryFeedback: string | null;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ default: false })
  clientConfirmed: boolean;

  @Column({ default: false })
  termsAccepted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  client: Relation<User>;

  @ManyToOne(() => User, { nullable: false })
  artisan: Relation<User>;

  @ManyToOne(() => Service, { nullable: false })
  service: Relation<Service>;
}

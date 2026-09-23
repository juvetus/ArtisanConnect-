import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';

export type ServiceStatus = 'draft' | 'pending_validation' | 'validation_requested' | 'approved' | 'rejected';

@Entity('services')
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMin: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceMax: number | null;

  @Column()
  estimatedDays: number;

  @Column()
  category: string;

  @Column('simple-array', { nullable: true })
  tags: string[];

  @Column('simple-array', { nullable: true })
  fileUrls: string[];

  @Column('simple-array', { nullable: true })
  videoUrls: string[];

  @Column('simple-array', { nullable: true })
  externalUrls: string[];

  @Column({ type: 'enum', enum: ['draft', 'pending_validation', 'validation_requested', 'approved', 'rejected'], default: 'draft' })
  status: ServiceStatus;

  @Column({ type: 'text', nullable: true })
  validationFeedback: string | null;

  @ManyToOne(() => User, { nullable: false })
  artisan: Relation<User>;

  @ManyToOne(() => User, { nullable: true })
  validatedBy: Relation<User> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  validatedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revisionDueAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  sponsoredUntil: Date | null;
}

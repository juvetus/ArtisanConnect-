import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';

export type ReportTargetType = 'listing' | 'shop' | 'user' | 'review';
export type ReportReason = 'fraud' | 'inappropriate' | 'counterfeit' | 'spam' | 'wrong_info' | 'other';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';

/** Signalement d'une annonce, d'une boutique, d'un vendeur ou d'un avis. */
@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  reporterId: string;

  @Column('enum', { enum: ['listing', 'shop', 'user', 'review'] })
  targetType: ReportTargetType;

  @Column()
  targetId: string;

  @Column('enum', { enum: ['fraud', 'inappropriate', 'counterfeit', 'spam', 'wrong_info', 'other'] })
  reason: ReportReason;

  @Column({ type: 'text' })
  details: string;

  @Column('enum', { enum: ['open', 'reviewing', 'resolved', 'dismissed'], default: 'open' })
  status: ReportStatus;

  @Column({ type: 'varchar', nullable: true })
  moderatorId: string | null;

  @Column({ type: 'text', nullable: true })
  moderatorNotes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  reporter: Relation<User>;
}

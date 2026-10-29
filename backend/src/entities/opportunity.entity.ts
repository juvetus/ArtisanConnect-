import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';

@Entity('opportunities')
@Index(['source', 'externalId'], { unique: true })
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  source: 'armp' | 'ungm' | 'manual';

  @Column()
  externalId: string;

  @Column('text')
  sourceUrl: string;

  @Column('text')
  title: string;

  @Column({ default: '' })
  organization: string;

  @Column({ default: '' })
  location: string;

  @Column({ default: '' })
  reference: string;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date | null;

  @Column('text', { default: '' })
  summary: string;

  @Column('text', { array: true, default: '{}' })
  trades: string[];

  @Column({ default: 'draft' })
  status: 'draft' | 'published' | 'archived';

  @Column({ default: 'pending' })
  analysisStatus: 'pending' | 'done' | 'failed';

  @Column({ type: 'text', nullable: true })
  analysisError: string | null;

  @Column({ type: 'uuid', nullable: true })
  reviewedById: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('opportunity_watch_runs')
export class OpportunityWatchRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  source: string;

  @Column({ default: 'running' })
  status: 'queued' | 'running' | 'completed' | 'failed';

  @Column({ default: 0 })
  fetched: number;

  @Column({ default: 0 })
  imported: number;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  finishedAt: Date | null;
}

@Entity('opportunity_preferences')
export class OpportunityPreference {
  @Column({ primary: true, type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column({ default: false })
  subscribed: boolean;

  @Column('text', { array: true, default: '{}' })
  trades: string[];

  @Column({ default: false })
  emailEnabled: boolean;

  @Column({ default: false })
  whatsappEnabled: boolean;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('opportunity_deliveries')
@Index(['opportunityId', 'userId', 'channel'], { unique: true })
export class OpportunityDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  opportunityId: string;

  @ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunityId' })
  opportunity: Relation<Opportunity>;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column()
  channel: 'internal' | 'email' | 'whatsapp';

  @Column({ default: 'pending' })
  status: 'pending' | 'sending' | 'sent' | 'failed' | 'skipped';

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('opportunity_groups')
@Index(['opportunityId', 'ownerId'], { unique: true })
export class OpportunityGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  opportunityId: string;

  @ManyToOne(() => Opportunity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunityId' })
  opportunity: Relation<Opportunity>;

  @Column('uuid')
  ownerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<User>;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column()
  capacity: number;

  @Column({ default: 'open' })
  status: 'open' | 'closed';

  @CreateDateColumn()
  createdAt: Date;
}

@Entity('opportunity_group_members')
@Index(['groupId', 'userId'], { unique: true })
export class OpportunityGroupMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  groupId: string;

  @ManyToOne(() => OpportunityGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Relation<OpportunityGroup>;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @Column({ default: 'pending' })
  status: 'pending' | 'accepted' | 'rejected';

  @CreateDateColumn()
  createdAt: Date;
}

export const OPPORTUNITY_ENTITIES = [
  Opportunity, OpportunityWatchRun, OpportunityPreference, OpportunityDelivery, OpportunityGroup, OpportunityGroupMember,
];

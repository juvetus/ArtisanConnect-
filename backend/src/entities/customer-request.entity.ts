import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CustomerRequestStatus = 'new' | 'contacted' | 'in_progress' | 'completed';

@Entity('customer_requests')
export class CustomerRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  clientId: string;

  @Column()
  category: string;

  @Column()
  city: string;

  @Column({ type: 'varchar', nullable: true })
  neighborhood: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 0, nullable: true })
  budgetMin: number | null;

  @Column({ type: 'decimal', precision: 12, scale: 0, nullable: true })
  budgetMax: number | null;

  @Column({ type: 'varchar', nullable: true })
  requestedDate: string | null;

  @Column({ type: 'varchar', default: 'new' })
  status: CustomerRequestStatus;

  @Column('simple-array', { nullable: true })
  contactedArtisanIds: string[];

  @Column({ type: 'jsonb', default: [] })
  responses: { artisanId: string; price?: number; days?: number; message: string; status?: 'accepted' | 'rejected'; createdAt: string }[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CustomerRequestStatus = 'open' | 'assigned' | 'closed';

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

  @Column('enum', { enum: ['open', 'assigned', 'closed'], default: 'open' })
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

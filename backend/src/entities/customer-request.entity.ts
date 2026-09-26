import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type CustomerRequestStatus = 'new' | 'contacted' | 'in_progress' | 'completed';
export type ContactPreference = 'platform' | 'whatsapp' | 'both';
export type CustomerRequestPaymentStatus = 'unpaid' | 'pending' | 'paid';

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

  /** Photos du besoin : un artisan chiffre bien mieux avec des images. */
  @Column('simple-array', { nullable: true })
  fileUrls: string[];

  @Column({ type: 'varchar', default: 'platform' })
  contactPreference: ContactPreference;

  @Column({ type: 'varchar', nullable: true })
  contactPhone: string | null;

  @Column({ type: 'varchar', default: 'new' })
  status: CustomerRequestStatus;

  @Column('simple-array', { nullable: true })
  contactedArtisanIds: string[];

  @Column({ type: 'jsonb', default: [] })
  responses: { artisanId: string; price?: number; days?: number; message: string; status?: 'accepted' | 'rejected'; createdAt: string; updatedAt?: string }[];

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt: Date | null;

  @Column({ type: 'varchar', default: 'unpaid' })
  paymentStatus: CustomerRequestPaymentStatus;

  @Column({ type: 'varchar', nullable: true })
  paymentMethod: 'momo' | 'cash' | null;

  @Column({ type: 'decimal', precision: 12, scale: 0, nullable: true })
  paymentAmount: number | null;

  @Column({ type: 'varchar', nullable: true })
  paymentReference: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

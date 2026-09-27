import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('invoices')
@Index(['orderId'], { unique: true })
@Index(['invoiceNumber'], { unique: true })
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  invoiceNumber: string;

  @Column()
  buyerId: string;

  @Column()
  sellerId: string;

  @Column('decimal', { precision: 12, scale: 0 })
  subtotal: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  taxRate: number;

  @Column('decimal', { precision: 12, scale: 0, default: 0 })
  taxAmount: number;

  @Column('decimal', { precision: 12, scale: 0 })
  total: number;

  @Column({ default: 'XAF' })
  currency: string;

  @Column({ default: 'issued' })
  status: 'issued' | 'cancelled';

  @Column({ type: 'timestamp', nullable: true })
  issuedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

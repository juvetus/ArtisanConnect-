import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  artisanId: string;

  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column('decimal', { precision: 12, scale: 0, default: 0 })
  amount: number;

  @Column({ default: 'XAF' })
  currency: string;

  @Column('enum', { enum: ['pending', 'processing', 'success', 'failed'], default: 'pending' })
  status: 'pending' | 'processing' | 'success' | 'failed';

  @Column({ default: 'momo' })
  provider: string;

  @Column({ type: 'varchar', nullable: true })
  providerReference: string | null;

  @Column({ type: 'varchar', nullable: true })
  recipientPhone: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type ServicePaymentType = 'deposit' | 'balance';
export type ServicePaymentStatus = 'pending' | 'paid' | 'refunded';
export type ServicePaymentMethod = 'orange_money' | 'stripe' | 'cash';

@Entity('service_payments')
export class ServicePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column({ type: 'enum', enum: ['deposit', 'balance'] })
  type: ServicePaymentType;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['pending', 'paid', 'refunded'], default: 'pending' })
  status: ServicePaymentStatus;

  @Column({ type: 'enum', enum: ['orange_money', 'stripe', 'cash'], default: 'orange_money' })
  method: ServicePaymentMethod;

  @Column({ type: 'varchar', nullable: true })
  transactionId: string | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

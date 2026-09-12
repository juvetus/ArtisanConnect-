import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { Service } from './service.entity.js';
import { User } from './user.entity.js';

export type ServiceValidationAction = 'approved' | 'rejected' | 'revision_requested' | 'auto_rejected';

@Entity('service_validation_history')
export class ServiceValidationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  serviceId: string;

  @Column({ nullable: true })
  adminId: string | null;

  @Column({ type: 'enum', enum: ['approved', 'rejected', 'revision_requested', 'auto_rejected'] })
  action: ServiceValidationAction;

  @Column({ type: 'varchar', nullable: true })
  previousStatus: string | null;

  @Column()
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  feedback: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Service, { nullable: false })
  service: Relation<Service>;

  @ManyToOne(() => User, { nullable: false })
  admin: Relation<User>;
}

import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Service } from './service.entity.js';
import { ServiceOrder } from './service-order.entity.js';

@Entity('service_reviews')
export class ServiceReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @Column()
  serviceId: string;

  @Column()
  reviewerId: string;

  @Column()
  recipientId: string;

  @Column({ type: 'int' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ default: true })
  verified: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ServiceOrder, { nullable: false })
  order: Relation<ServiceOrder>;

  @ManyToOne(() => Service, { nullable: false })
  service: Relation<Service>;

  @ManyToOne(() => User, { nullable: false })
  reviewer: Relation<User>;

  @ManyToOne(() => User, { nullable: false })
  recipient: Relation<User>;
}

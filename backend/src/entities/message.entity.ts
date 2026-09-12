import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Order } from './order.entity.js';
import { ServiceOrder } from './service-order.entity.js';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  senderId: string;

  @Column()
  recipientId: string;

  @Column({ nullable: true })
  orderId: string;

  @Column({ nullable: true })
  serviceOrderId: string | null;

  @Column({ type: 'text' })
  content: string;

  @Column('simple-array', { nullable: true })
  fileUrls: string[];

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.sentMessages)
  sender: Relation<User>;

  @ManyToOne(() => User, (user) => user.receivedMessages)
  recipient: Relation<User>;

  @ManyToOne(() => Order, { nullable: true })
  order: Relation<Order>;

  @ManyToOne(() => ServiceOrder, { nullable: true })
  serviceOrder: Relation<ServiceOrder>;
}

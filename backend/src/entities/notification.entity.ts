import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';

export type NotificationType =
  | 'new_order'
  | 'order_status'
  | 'payment'
  | 'shop_review'
  | 'service_review'
  | 'general';

@Entity('notifications')
@Index(['recipientId', 'read'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  recipientId: string;

  @Column('enum', { enum: ['new_order', 'order_status', 'payment', 'shop_review', 'service_review', 'general'], default: 'general' })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  content: string;

  /** Lien frontal vers lequel la notification pointe (ex : /dashboard). */
  @Column({ nullable: true })
  link: string;

  /** Identifiant d'entité liée (commande, boutique…) pour éviter les doublons de lecture. */
  @Column({ nullable: true })
  relatedId: string;

  @Column({ default: false })
  read: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.notifications, { onDelete: 'CASCADE' })
  recipient: Relation<User>;
}

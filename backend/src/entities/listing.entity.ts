import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { Order } from './order.entity.js';

@Entity('listings')
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column('enum', { enum: ['product', 'service'] })
  type: 'product' | 'service';

  @Column('decimal', { precision: 12, scale: 0 })
  price: number;

  @Column({ nullable: true })
  imageUrl: string;

  @Column('enum', { enum: ['active', 'inactive'], default: 'active' })
  status: 'active' | 'inactive';

  @Column({ default: 0 })
  stock: number; // Pour les produits

  @Column({ nullable: true })
  availability: string; // Pour les services

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.listings, { onDelete: 'CASCADE' })
  seller: Relation<User>;

  @Column()
  sellerId: string;

  @OneToMany(() => Order, (order) => order.listing)
  orders: Relation<Order>[];
}

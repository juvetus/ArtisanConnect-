import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';

@Entity('artisan_formalizations')
export class ArtisanFormalization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  artisan: Relation<User>;

  @Column()
  businessName: string;

  @Column({ type: 'varchar', nullable: true })
  registrationNumber: string | null;

  @Column({ type: 'varchar', nullable: true })
  taxId: string | null;

  @Column({ type: 'text', nullable: true })
  documentsUrl: string | null;

  @Column('enum', { enum: ['draft', 'submitted', 'in_review', 'approved', 'rejected'], default: 'draft' })
  status: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected';

  @Column({ default: 0 })
  progress: number;

  @Column({ type: 'text', nullable: true })
  institutionNotes: string | null;

  @ManyToOne(() => User, { nullable: true })
  reviewedBy: Relation<User> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
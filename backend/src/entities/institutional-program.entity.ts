import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';

@Entity('institutional_programs')
export class InstitutionalProgram {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('enum', { enum: ['training', 'support', 'funding', 'grant'] })
  type: 'training' | 'support' | 'funding' | 'grant';

  @Column({ type: 'text', nullable: true })
  eligibility: string | null;
  
  @Column({ type: 'decimal', precision: 14, scale: 2, nullable: true })
  budget: number | null;
  
  @Column({ type: 'varchar', nullable: true })
  interventionZone: string | null;
  
  @Column({ type: 'date', nullable: true })
  startDate: string | null;
  
  @Column({ type: 'date', nullable: true })
  endDate: string | null;
  
  @Column({ type: 'text', nullable: true })
  objectives: string | null;
  
  @Column({ type: 'text', nullable: true })
  targetBeneficiaries: string | null;
  
  @Column({ type: 'jsonb', default: [] })
  impactIndicators: string[];

  @Column({ default: 'active' })
  status: 'active' | 'closed';

  @Column({ type: 'varchar', nullable: false })
  institutionId: string;

  @ManyToOne(() => User, { nullable: false })
  institution: Relation<User>;

  @CreateDateColumn()
  createdAt: Date;
}
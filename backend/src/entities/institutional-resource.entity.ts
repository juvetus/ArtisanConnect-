


import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { InstitutionalProgram } from './institutional-program.entity.js';

@Entity('institutional_resources')
export class InstitutionalResource {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column('enum', { enum: ['training', 'guide', 'template'] })
  type: 'training' | 'guide' | 'template';

  @Column()
  theme: string;

  @Column({ type: 'text', nullable: true })
  contentUrl: string | null;

  @Column({ default: true })
  published: boolean;





    @ManyToOne(() => User, { nullable: false })
  institution: Relation<User>;

  @ManyToOne(() => InstitutionalProgram, { nullable: true, onDelete: 'CASCADE' })
  program: Relation<InstitutionalProgram> | null;

  @CreateDateColumn()
  createdAt: Date;
}
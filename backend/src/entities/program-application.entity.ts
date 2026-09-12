import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
import { InstitutionalProgram } from './institutional-program.entity.js';

export type ProgramApplicationStatus = 'submitted' | 'in_review' | 'accepted' | 'rejected';

@Entity('program_applications')
export class ProgramApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  artisanId: string;

  @Column()
  programId: string;

  @Column({ type: 'text' })
  motivation: string;

  @Column({ type: 'enum', enum: ['submitted', 'in_review', 'accepted', 'rejected'], default: 'submitted' })
  status: ProgramApplicationStatus;

  @Column({ type: 'text', nullable: true })
  institutionNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { nullable: false })
  artisan: Relation<User>;

  @ManyToOne(() => InstitutionalProgram, { nullable: false })
  program: Relation<InstitutionalProgram>;
}

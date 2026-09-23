import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_image_generations')
export class AiImageGeneration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  subscriptionId: string;

  @CreateDateColumn()
  createdAt: Date;
}

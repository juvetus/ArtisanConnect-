import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('promotion_redemptions')
@Index(['promotionCodeId', 'userId'], { unique: true })
export class PromotionRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  promotionCodeId: string;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}

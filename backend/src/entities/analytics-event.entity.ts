import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export type AnalyticsEventType =
  | 'search'
  | 'category_view'
  | 'artisan_profile_view'
  | 'listing_view'
  | 'whatsapp_click'
  | 'quote_form_opened';

/** Évènements d'usage anonymes servant à mesurer le tunnel visiteur → demande. */
@Entity('analytics_events')
@Index(['type', 'createdAt'])
export class AnalyticsEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  type: AnalyticsEventType;

  /** Identifiant aléatoire de navigateur : permet de compter les visiteurs sans les identifier. */
  @Column({ type: 'varchar', length: 64 })
  sessionId: string;

  @Column({ type: 'varchar', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  label: string | null;

  @Column({ type: 'varchar', nullable: true })
  targetId: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  city: string | null;

  @CreateDateColumn()
  createdAt: Date;
}

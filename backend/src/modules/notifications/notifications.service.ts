import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Notification, type NotificationType } from '../../entities/notification.entity.js';
import { User } from '../../entities/user.entity.js';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @Optional() @InjectRepository(User) private usersRepository?: Repository<User>,
    @Optional() private emailService?: EmailService,
  ) { }

  /** Crée une notification pour un destinataire donné (feu, oubliez : c'est ici que tout passe). */
  async notify(data: {
    recipientId: string;
    type: NotificationType;
    title: string;
    content: string;
    link?: string;
    relatedId?: string;
  }): Promise<Notification> {
    const notification = this.notificationsRepository.create(data);
    return this.notificationsRepository.save(notification);
  }

  async notifyAdmins(data: { title: string; content: string; link: string; relatedId?: string }) {
    if (!this.usersRepository) return;
    const admins = await this.usersRepository.find({ where: { role: 'admin', isActive: true } });
    await Promise.all(admins.map(async (admin) => {
      await this.notify({ recipientId: admin.id, type: 'general', title: data.title, content: data.content, link: data.link, relatedId: data.relatedId });
      if (admin.email) {
        await this.emailService?.send({
          to: admin.email,
          subject: `[ArtisanConnect] ${data.title}`,
          text: `${data.content}\n\nConsulter : ${process.env.FRONTEND_URL ?? 'http://localhost:3000'}${data.link}`,
        });
      }
    }));
  }

  async findByRecipient(recipientId: string, skip = 0, take = 30): Promise<[Notification[], number]> {
    return this.notificationsRepository.findAndCount({
      where: { recipientId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async unreadCount(recipientId: string): Promise<number> {
    return this.notificationsRepository.count({ where: { recipientId, read: false } });
  }

  async hasRecent(recipientId: string, relatedId: string, title: string, since: Date): Promise<boolean> {
    return (await this.notificationsRepository.count({
      where: { recipientId, relatedId, title, createdAt: MoreThan(since) },
    })) > 0;
  }

  async markAsRead(id: string, recipientId: string): Promise<void> {
    await this.notificationsRepository.update({ id, recipientId }, { read: true });
  }

  async markAllAsRead(recipientId: string): Promise<void> {
    await this.notificationsRepository.update({ recipientId, read: false }, { read: true });
  }

  /** Purge simple des notifications lues de plus de 30 jours. */
  async purgeOld(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await this.notificationsRepository.delete({ read: true, createdAt: LessThan(cutoff) });
  }
}

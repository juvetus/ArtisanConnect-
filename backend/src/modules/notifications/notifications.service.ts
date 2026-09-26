import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan } from 'typeorm';
import { Notification, type NotificationType } from '../../entities/notification.entity.js';
import { User } from '../../entities/user.entity.js';
import { EmailService } from '../email/email.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @Optional() @InjectRepository(User) private usersRepository?: Repository<User>,
    @Optional() private emailService?: EmailService,
    @Optional() private whatsAppService?: WhatsAppService,
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
    const saved = await this.notificationsRepository.save(notification);
    await this.deliverExternalChannels(data);
    return saved;
  }

  private async deliverExternalChannels(data: {
    recipientId: string;
    title: string;
    content: string;
    link?: string;
  }): Promise<void> {
    if (!this.usersRepository) return;
    try {
      const recipient = await this.usersRepository.findOne({ where: { id: data.recipientId } });
      if (!recipient) return;

      const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
      const link = data.link
        ? (data.link.startsWith('http') ? data.link : `${baseUrl}${data.link}`)
        : baseUrl;
      const sends: Promise<unknown>[] = [];
      if (recipient.email && !recipient.email.endsWith('@phone.artisanconnect.local') && this.emailService) {
        const escapedContent = this.escapeHtml(data.content).replace(/\n/g, '<br>');
        const escapedLink = this.escapeHtml(link);
        sends.push(this.emailService.send({
          to: recipient.email,
          subject: `[ArtisanConnect] ${data.title}`,
          text: `${data.content}\n\nConsulter : ${link}`,
          html: `<p>${escapedContent}</p><p><a href="${escapedLink}">Consulter sur ArtisanConnect</a></p>`,
        }));
      }

      const phone = recipient.whatsappPhone ?? recipient.phone;
      if (phone && this.whatsAppService) {
        sends.push(this.whatsAppService.sendNotification(phone, recipient.name ?? 'Utilisateur', data.title, data.content, link, recipient.role === 'admin'));
      } else if (recipient.role === 'admin' && this.whatsAppService) {
        sends.push(this.whatsAppService.sendNotification(undefined, recipient.name ?? 'Administration', data.title, data.content, link, true));
      }
      await Promise.allSettled(sends);
    } catch {
      // Une erreur de canal externe ne doit pas annuler la notification dans l'application.
    }
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }

  async notifyAdmins(data: { title: string; content: string; link: string; relatedId?: string }) {
    if (!this.usersRepository) return;
    const admins = await this.usersRepository.find({ where: { role: 'admin', isActive: true } });
    await Promise.all(admins.map((admin) => this.notify({
      recipientId: admin.id,
      type: 'general',
      title: data.title,
      content: data.content,
      link: data.link,
      relatedId: data.relatedId,
    })));
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

  async unreadOpportunityCount(recipientId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { recipientId, read: false, title: 'Nouvelle demande client pour vous' },
    });
  }

  async markOpportunityNotificationsRead(recipientId: string): Promise<void> {
    await this.notificationsRepository.update(
      { recipientId, read: false, title: 'Nouvelle demande client pour vous' },
      { read: true },
    );
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

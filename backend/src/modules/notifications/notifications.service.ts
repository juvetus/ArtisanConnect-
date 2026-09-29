import { Injectable, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, LessThan, MoreThan } from 'typeorm';
import { Notification, type NotificationType } from '../../entities/notification.entity.js';
import { User } from '../../entities/user.entity.js';
import { EmailService } from '../email/email.service.js';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

export const CUSTOMER_REQUEST_FOLLOW_UP_NOTIFICATION_TITLE = 'Rappel : demande client en attente';

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
        sends.push(this.emailService.send({
          to: recipient.email,
          subject: `[ArtisanConnect] ${data.title}`,
          text: `${data.content}\n\nConsulter : ${link}`,
          html: this.buildNotificationHtml(data.title, data.content, link),
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

  private buildNotificationHtml(title: string, content: string, link: string): string {
    const escapedTitle = this.escapeHtml(title);
    const escapedContent = this.escapeHtml(content).replace(/\n/g, '<br>');
    const escapedLink = this.escapeHtml(link);
    return `
      <div style="margin:0;background:#f5f5f4;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#292524;line-height:1.5;">
        <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #e7e5e4;border-radius:12px;background:#ffffff;">
          <div style="background:#1c1917;padding:24px 28px;color:#ffffff;">
            <div style="font-size:22px;font-weight:700;letter-spacing:-.02em;">Artisan<span style="color:#fbbf24;">Connect</span></div>
            <div style="margin-top:6px;color:#d6d3d1;font-size:13px;">Une notification concernant votre compte</div>
          </div>
          <div style="padding:28px;">
            <h1 style="margin:0 0 20px;font-size:20px;color:#1c1917;">${escapedTitle}</h1>
            <div style="border-left:4px solid #d97706;padding:4px 0 4px 16px;">${escapedContent}</div>
            <a href="${escapedLink}" style="display:inline-block;margin-top:24px;border-radius:6px;background:#b45309;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;">Consulter sur ArtisanConnect</a>
          </div>
          <div style="border-top:1px solid #e7e5e4;padding:16px 28px;color:#78716c;font-size:12px;">ArtisanConnect · La marketplace des artisans et vendeurs locaux du Cameroun</div>
        </div>
      </div>`;
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

  async findByRecipient(recipientId: string, skip = 0, take = 30, search = ''): Promise<[Notification[], number]> {
    const query = this.notificationsRepository.createQueryBuilder('notification')
      .where('notification.recipientId = :recipientId', { recipientId });
    const normalizedSearch = search.trim();
    if (normalizedSearch) {
      query.andWhere('(notification.title ILIKE :search OR notification.content ILIKE :search)', {
        search: `%${normalizedSearch}%`,
      });
    }
    return query
      .orderBy('notification.createdAt', 'DESC')
      .skip(Math.max(0, skip))
      .take(Math.min(100, Math.max(1, take)))
      .getManyAndCount();
  }

  async unreadCount(recipientId: string): Promise<number> {
    return this.notificationsRepository.count({ where: { recipientId, read: false } });
  }

  async unreadOpportunityCount(recipientId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { recipientId, read: false, title: In(['Nouvelle demande client pour vous', CUSTOMER_REQUEST_FOLLOW_UP_NOTIFICATION_TITLE]) },
    });
  }

  async markOpportunityNotificationsRead(recipientId: string): Promise<void> {
    await this.notificationsRepository.update(
      { recipientId, read: false, title: In(['Nouvelle demande client pour vous', CUSTOMER_REQUEST_FOLLOW_UP_NOTIFICATION_TITLE]) },
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

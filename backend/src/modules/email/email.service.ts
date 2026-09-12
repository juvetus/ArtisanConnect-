import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly enabled: boolean;
  private readonly from: string;
  private transporter: Transporter | null = null;

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get('SMTP_ENABLED', 'false') === 'true';
    this.from = this.config.get('SMTP_FROM', this.config.get('SMTP_USER', ''));
  }

  async send(message: EmailMessage): Promise<boolean> {
    if (!this.enabled) {
      this.logger.debug(`SMTP disabled; email skipped for ${message.to}`);
      return false;
    }

    if (!this.from || !this.config.get('SMTP_HOST')) {
      this.logger.warn('SMTP is enabled but SMTP_FROM or SMTP_HOST is missing');
      return false;
    }

    try {
      await this.getTransporter().sendMail({
        from: this.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        attachments: message.attachments,
      });
      return true;
    } catch (error) {
      this.logger.error(`Email delivery failed for ${message.to}`, error instanceof Error ? error.stack : undefined);
      return false;
    }
  }

  async sendServiceStatusEmail(data: {
    to: string;
    artisanName: string;
    serviceTitle: string;
    status: 'approved' | 'rejected' | 'revision_requested';
    feedback?: string;
    serviceUrl?: string;
  }): Promise<boolean> {
    const labels = {
      approved: 'Service approuve',
      rejected: 'Service refuse',
      revision_requested: 'Modification demandee pour votre service',
    } as const;
    const action = data.serviceUrl ? `\nConsulter le service : ${data.serviceUrl}` : '';
    const feedback = data.feedback ? `\n\nFeedback :\n${data.feedback}` : '';
    const text = `Bonjour ${data.artisanName},\n\n${labels[data.status]} : ${data.serviceTitle}.${feedback}${action}\n\nArtisanConnect`;

    return this.send({
      to: data.to,
      subject: `[ArtisanConnect] ${labels[data.status]}`,
      text,
      html: `<p>Bonjour ${data.artisanName},</p><p><strong>${labels[data.status]} :</strong> ${data.serviceTitle}</p>${data.feedback ? `<p><strong>Feedback :</strong><br>${this.escapeHtml(data.feedback)}</p>` : ''}${data.serviceUrl ? `<p><a href="${this.escapeHtml(data.serviceUrl)}">Consulter le service</a></p>` : ''}<p>ArtisanConnect</p>`,
    });
  }

  async sendQuoteEmail(data: {
    to: string;
    recipientName: string;
    serviceTitle: string;
    kind: 'received' | 'accepted' | 'rejected';
    price?: number;
    days?: number;
    response?: string;
    serviceUrl?: string;
  }): Promise<boolean> {
    const labels = {
      received: 'Nouveau devis reçu',
      accepted: 'Devis accepté',
      rejected: 'Devis refusé',
    } as const;
    const quote = data.price && data.days ? `\nPrix : ${data.price} FCFA\nDélai : ${data.days} jours` : '';
    const response = data.response ? `\nRéponse : ${data.response}` : '';
    const action = data.serviceUrl ? `\nConsulter : ${data.serviceUrl}` : '';
    return this.send({
      to: data.to,
      subject: `[ArtisanConnect] ${labels[data.kind]}`,
      text: `Bonjour ${data.recipientName},\n\n${labels[data.kind]} pour ${data.serviceTitle}.${quote}${response}${action}`,
      html: `<p>Bonjour ${data.recipientName},</p><p><strong>${labels[data.kind]}</strong> pour ${this.escapeHtml(data.serviceTitle)}.</p>${data.price && data.days ? `<p>Prix : ${data.price} FCFA<br>Délai : ${data.days} jours</p>` : ''}${data.response ? `<p>Réponse : ${this.escapeHtml(data.response)}</p>` : ''}${data.serviceUrl ? `<p><a href="${this.escapeHtml(data.serviceUrl)}">Consulter la demande</a></p>` : ''}`,
    });
  }

  private getTransporter(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST'),
        port: this.config.get<number>('SMTP_PORT', 587),
        secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASSWORD'),
        },
      });
    }
    return this.transporter;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>\"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }
}

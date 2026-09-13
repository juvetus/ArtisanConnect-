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

  async sendVerificationEmail(data: {
    to: string;
    userName: string;
    verificationUrl: string;
  }): Promise<boolean> {
    const text = `Bonjour ${data.userName},\n\nMerci de vous être inscrit sur ArtisanConnect. Veuillez confirmer votre adresse email en cliquant sur le lien suivant :\n${data.verificationUrl}\n\nCe lien expirera dans 24 heures.\n\nSi vous n'avez pas créé de compte, vous pouvez ignorer cet email.\n\nL'équipe ArtisanConnect`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #292524; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #b45309; margin: 0; font-size: 24px;">ArtisanConnect</h1>
          <p style="color: #78716c; font-size: 14px; margin: 4px 0 0;">Le carrefour du savoir-faire artisanal</p>
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="font-size: 18px; color: #1c1917; margin-top: 0;">Confirmez votre adresse email</h2>
          <p>Bonjour <strong>${this.escapeHtml(data.userName)}</strong>,</p>
          <p>Merci de rejoindre <strong>ArtisanConnect</strong> ! Pour activer pleinement toutes les fonctionnalités de votre compte, veuillez confirmer votre adresse email.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.escapeHtml(data.verificationUrl)}" style="background-color: #b45309; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">
              Vérifier mon adresse email
            </a>
          </div>
          <p style="font-size: 13px; color: #78716c;">Ou copiez et collez ce lien dans votre navigateur :<br>
            <a href="${this.escapeHtml(data.verificationUrl)}" style="color: #b45309; word-break: break-all;">${this.escapeHtml(data.verificationUrl)}</a>
          </p>
          <p style="font-size: 12px; color: #a8a29e; margin-top: 24px; border-top: 1px solid #f5f5f4; padding-top: 12px;">
            Ce lien est valable pendant 24 heures. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #a8a29e;">
          &copy; ${new Date().getFullYear()} ArtisanConnect. Tous droits réservés.
        </div>
      </div>
    `;

    return this.send({
      to: data.to,
      subject: '[ArtisanConnect] Vérifiez votre adresse email',
      text,
      html,
    });
  }

  async sendPasswordResetEmail(data: {
    to: string;
    userName: string;
    resetUrl: string;
  }): Promise<boolean> {
    const text = `Bonjour ${data.userName},\n\nVous avez demandé la réinitialisation de votre mot de passe sur ArtisanConnect.\n\nVeuillez cliquer sur le lien suivant pour définir un nouveau mot de passe :\n${data.resetUrl}\n\nCe lien expirera dans 1 heure.\n\nSi vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer ce message en toute sécurité.\n\nL'équipe ArtisanConnect`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #292524; line-height: 1.6;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #b45309; margin: 0; font-size: 24px;">ArtisanConnect</h1>
          <p style="color: #78716c; font-size: 14px; margin: 4px 0 0;">Le carrefour du savoir-faire artisanal</p>
        </div>
        <div style="background-color: #ffffff; border: 1px solid #e7e5e4; border-radius: 8px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <h2 style="font-size: 18px; color: #1c1917; margin-top: 0;">Réinitialisation de votre mot de passe</h2>
          <p>Bonjour <strong>${this.escapeHtml(data.userName)}</strong>,</p>
          <p>Nous avons reçu une demande de réinitialisation de mot de passe pour votre compte <strong>ArtisanConnect</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.escapeHtml(data.resetUrl)}" style="background-color: #b45309; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">
              Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="font-size: 13px; color: #78716c;">Ou copiez et collez ce lien dans votre navigateur :<br>
            <a href="${this.escapeHtml(data.resetUrl)}" style="color: #b45309; word-break: break-all;">${this.escapeHtml(data.resetUrl)}</a>
          </p>
          <p style="font-size: 12px; color: #a8a29e; margin-top: 24px; border-top: 1px solid #f5f5f4; padding-top: 12px;">
            Ce lien est valable pendant 1 heure. Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet email en toute sécurité. Votre mot de passe actuel reste inchangé.
          </p>
        </div>
        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #a8a29e;">
          &copy; ${new Date().getFullYear()} ArtisanConnect. Tous droits réservés.
        </div>
      </div>
    `;

    return this.send({
      to: data.to,
      subject: '[ArtisanConnect] Réinitialisation de votre mot de passe',
      text,
      html,
    });
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

  async sendNewMessageEmail(data: {
    to: string;
    recipientName: string;
    senderName: string;
    content: string;
    messagesUrl: string;
    hasAttachments?: boolean;
  }): Promise<boolean> {
    const attachmentNotice = data.hasAttachments ? '\nCe message contient une pièce jointe.' : '';
    const preview = data.content.length > 600 ? `${data.content.slice(0, 600)}...` : data.content;
    const text = `Bonjour ${data.recipientName},\n\nVous avez reçu un nouveau message de ${data.senderName} sur ArtisanConnect.${attachmentNotice}\n\nMessage :\n${preview}\n\nConsulter la conversation : ${data.messagesUrl}\n\nArtisanConnect`;

    return this.send({
      to: data.to,
      subject: `[ArtisanConnect] Nouveau message de ${data.senderName}`,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #292524; line-height: 1.6;">
          <h1 style="color: #b45309; margin: 0 0 20px; font-size: 22px;">ArtisanConnect</h1>
          <p>Bonjour <strong>${this.escapeHtml(data.recipientName)}</strong>,</p>
          <p>Vous avez reçu un nouveau message de <strong>${this.escapeHtml(data.senderName)}</strong>.</p>
          ${data.hasAttachments ? '<p>Ce message contient une pièce jointe.</p>' : ''}
          <blockquote style="margin: 20px 0; padding: 12px 16px; background: #fafaf9; border-left: 4px solid #b45309; color: #44403c; white-space: pre-line;">${this.escapeHtml(preview)}</blockquote>
          <p><a href="${this.escapeHtml(data.messagesUrl)}" style="background-color: #b45309; color: #ffffff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; display: inline-block;">Ouvrir la conversation</a></p>
          <p style="font-size: 12px; color: #78716c;">Ne répondez pas directement à cet e-mail. Utilisez la messagerie ArtisanConnect.</p>
        </div>
      `,
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

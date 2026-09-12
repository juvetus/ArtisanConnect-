import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service.js';

@Injectable()
export class ContactService {
  constructor(
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async sendMessage(data: { name: string; email: string; subject: string; message: string; city?: string; neighborhood?: string }, files: Express.Multer.File[] = []) {
    const name = data.name?.trim();
    const email = data.email?.trim();
    const subject = data.subject?.trim();
    const message = data.message?.trim();
    const city = data.city?.trim() || 'Non précisée';
    const neighborhood = data.neighborhood?.trim() || 'Non précisé';

    if (!name || !email || !subject || !message) {
      throw new BadRequestException('Tous les champs sont obligatoires');
    }
    if (message.length < 10) {
      throw new BadRequestException('Le message doit contenir au moins 10 caractères');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide');
    }
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'text/plain'];
    if (files.some((file) => !allowedTypes.includes(file.mimetype))) {
      throw new BadRequestException('Format de pièce jointe non accepté');
    }

    const recipient = this.config.get<string>('ADMIN_EMAIL');
    if (!recipient) throw new BadRequestException('Le support est temporairement indisponible');

    const sent = await this.emailService.send({
      to: recipient,
      subject: `[ArtisanConnect] ${subject}`,
      text: `Nouveau message de contact\n\nNom : ${name}\nE-mail : ${email}\nVille : ${city}\nQuartier : ${neighborhood}\nObjet : ${subject}\n\n${message}`,
      html: `<p><strong>Nouveau message de contact</strong></p><p>Nom : ${this.escapeHtml(name)}<br>E-mail : ${this.escapeHtml(email)}<br>Ville : ${this.escapeHtml(city)}<br>Quartier : ${this.escapeHtml(neighborhood)}<br>Objet : ${this.escapeHtml(subject)}</p><p>${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>`,
      attachments: files.map((file) => ({ filename: file.originalname, content: file.buffer, contentType: file.mimetype })),
    });

    return {
      sent,
      message: sent ? 'Votre message a bien été envoyé.' : 'Votre message a été reçu, mais l’envoi e-mail est momentanément indisponible.',
    };
  }

  private escapeHtml(value: string) {
    return value.replace(/[&<>\"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }
}

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
      replyTo: email,
      subject: `[ArtisanConnect] ${subject}`,
      text: `Nouveau message de contact\n\nNom : ${name}\nE-mail : ${email}\nVille : ${city}\nQuartier : ${neighborhood}\nObjet : ${subject}\n\n${message}`,
      html: `
        <div style="margin:0;background:#f5f5f4;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#292524;line-height:1.5;">
          <div style="max-width:640px;margin:0 auto;overflow:hidden;border:1px solid #e7e5e4;border-radius:12px;background:#ffffff;">
            <div style="background:#1c1917;padding:24px 28px;color:#ffffff;">
              <div style="font-size:22px;font-weight:700;letter-spacing:-.02em;">Artisan<span style="color:#fbbf24;">Connect</span></div>
              <div style="margin-top:6px;color:#d6d3d1;font-size:13px;">Nouveau message depuis le formulaire de contact</div>
            </div>
            <div style="padding:28px;">
              <h1 style="margin:0 0 20px;font-size:20px;color:#1c1917;">${this.escapeHtml(subject)}</h1>
              <div style="border:1px solid #e7e5e4;border-radius:8px;background:#fafaf9;padding:16px;">
                <p style="margin:0 0 8px;"><strong>Nom :</strong> ${this.escapeHtml(name)}</p>
                <p style="margin:0 0 8px;"><strong>E-mail :</strong> <a href="mailto:${this.escapeHtml(email)}" style="color:#b45309;">${this.escapeHtml(email)}</a></p>
                <p style="margin:0 0 8px;"><strong>Ville :</strong> ${this.escapeHtml(city)}</p>
                <p style="margin:0;"><strong>Quartier :</strong> ${this.escapeHtml(neighborhood)}</p>
              </div>
              <div style="margin-top:20px;border-left:4px solid #d97706;padding:4px 0 4px 16px;white-space:pre-line;">${this.escapeHtml(message)}</div>
              <a href="mailto:${this.escapeHtml(email)}?subject=${encodeURIComponent(`Re: ${subject}`)}" style="display:inline-block;margin-top:24px;border-radius:6px;background:#b45309;padding:12px 18px;color:#ffffff;text-decoration:none;font-weight:700;">Répondre à ${this.escapeHtml(name)}</a>
            </div>
            <div style="border-top:1px solid #e7e5e4;padding:16px 28px;color:#78716c;font-size:12px;">ArtisanConnect · Support de la marketplace</div>
          </div>
        </div>`,
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

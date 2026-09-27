import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  constructor(private readonly config: ConfigService) {}

  async sendOtp(phone: string, code: string): Promise<boolean> {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const sender = this.config.get<string>('BREVO_SMS_SENDER');
    if (!apiKey || !sender) {
      throw new ServiceUnavailableException('Le service SMS Brevo n’est pas configuré.');
    }
    if (!/^[A-Za-z0-9]{1,11}$/.test(sender)) {
      throw new ServiceUnavailableException('BREVO_SMS_SENDER doit contenir au maximum 11 caractères alphanumériques.');
    }

    const response = await fetch('https://api.brevo.com/v3/transactionalSMS/sms', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender,
        recipient: phone,
        content: `ArtisanConnect : votre code de vérification est ${code}. Il expire dans 10 minutes.`,
        type: 'transactional',
      }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json() as { message?: string; code?: string };
        detail = body.message || body.code || '';
      } catch {
        // Brevo peut répondre sans JSON lors d'une erreur de passerelle.
      }
      throw new ServiceUnavailableException(`Brevo SMS a refusé l’envoi (${response.status})${detail ? ` : ${detail}` : '.'}`);
    }

    return true;
  }
}

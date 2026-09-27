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
      throw new ServiceUnavailableException(`Brevo SMS a refusé l’envoi (${response.status}).`);
    }

    return true;
  }
}

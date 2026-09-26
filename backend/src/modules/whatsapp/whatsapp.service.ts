import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly config: ConfigService) {}

  async sendAdminNoMatch(summary: string, requestUrl: string): Promise<boolean> {
    const adminPhone = this.config.get<string>('ADMIN_WHATSAPP_PHONE', '+33782510546');
    return this.sendServiceRequest(adminPhone, ['Administration', summary, requestUrl]);
  }

  async sendServiceRequest(phone: string | null | undefined, parameters: string[]): Promise<boolean> {
    const accessToken = this.config.get<string>('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID');
    const templateName = this.config.get<string>('WHATSAPP_SERVICE_REQUEST_TEMPLATE');
    if (!accessToken || !phoneNumberId || !templateName || !phone) return false;

    const recipient = this.normalizePhone(phone);
    if (!recipient) return false;

    const version = this.config.get<string>('WHATSAPP_GRAPH_API_VERSION', 'v22.0');
    try {
      const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'template',
          template: {
            name: templateName,
            language: { code: this.config.get<string>('WHATSAPP_TEMPLATE_LANGUAGE', 'fr') },
            components: [{
              type: 'body',
              parameters: parameters.map((text) => ({ type: 'text', text: text.slice(0, 1024) })),
            }],
          },
        }),
      });
      if (!response.ok) {
        this.logger.warn(`WhatsApp template delivery failed with status ${response.status}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`WhatsApp template delivery failed: ${error instanceof Error ? error.message : 'unknown error'}`);
      return false;
    }
  }

  private normalizePhone(phone: string): string | null {
    const trimmed = phone.trim();
    const hasInternationalPrefix = trimmed.startsWith('+') || trimmed.startsWith('00');
    const digits = trimmed.startsWith('+')
      ? trimmed.slice(1).replace(/\D/g, '')
      : trimmed.startsWith('00')
        ? trimmed.slice(2).replace(/\D/g, '')
        : trimmed.replace(/\D/g, '');
    const international = hasInternationalPrefix || digits.startsWith('237')
      ? digits
      : digits.startsWith('0')
        ? `237${digits.slice(1)}`
        : `237${digits}`;
    return international.length >= 9 ? international : null;
  }
}
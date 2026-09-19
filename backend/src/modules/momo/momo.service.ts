import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export type MomoPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface InitiateMomoPaymentDto {
  orderId?: string;
  amount: number;
  currency?: string;
  externalId: string;
  payerPhone: string;
  payerMessage?: string;
  payeeNote?: string;
  callbackUrl?: string;
}

export interface MomoPaymentResult {
  status: MomoPaymentStatus;
  amount: number;
  currency: string;
  externalId: string;
  referenceId?: string;
  transactionId?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  message?: string;
  rawResponse?: unknown;
}

export type MomoWebhookHeaders = Record<string, string | string[] | undefined>;

export interface MomoWebhookPayload {
  amount?: string | number;
  currency?: string;
  externalId?: string;
  payer?: { partyIdType?: string; partyId?: string };
  payeeNote?: string;
  payerMessage?: string;
  status?: string;
  message?: string;
  referenceId?: string;
  transactionId?: string;
  [key: string]: unknown;
}

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);
  private readonly apiUser: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly subscriptionKey: string | undefined;
  private readonly webhookSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly targetEnvironment: string;
  private readonly apiUrl: string;
  private readonly frontendUrl: string;
  private readonly isMockMode: boolean;
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.apiUser = this.config.get<string>('MOMO_API_USER');
    this.apiKey = this.config.get<string>('MOMO_API_KEY');
    this.subscriptionKey = this.config.get<string>('MOMO_SUBSCRIPTION_KEY');
    this.webhookSecret = this.config.get<string>('MOMO_WEBHOOK_SECRET');
    this.baseUrl = this.config.get<string>('MOMO_BASE_URL') || 'https://sandbox.momodeveloper.mtn.com';
    this.targetEnvironment = this.config.get<string>('MOMO_TARGET_ENVIRONMENT') || 'sandbox';
    this.apiUrl = this.config.get<string>('API_URL') || 'http://localhost:3001';
    this.frontendUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.isMockMode = this.config.get<string>('MOMO_MODE') === 'mock' || !this.apiUser || !this.apiKey;
  }

  getWebhookUrl(path: string): string {
    return `${this.apiUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }

  getConfigurationStatus() {
    return {
      mode: this.isMockMode ? 'mock' : 'sandbox',
      configured: Boolean(this.apiUser && this.apiKey && this.subscriptionKey),
      targetEnvironment: this.targetEnvironment,
      baseUrl: this.baseUrl,
      callbackUrl: this.getWebhookUrl('momo/webhook'),
      missing: [
        !this.apiUser ? 'MOMO_API_USER' : null,
        !this.apiKey ? 'MOMO_API_KEY' : null,
        !this.subscriptionKey ? 'MOMO_SUBSCRIPTION_KEY' : null,
      ].filter((name): name is string => Boolean(name)),
    };
  }

  buildPaymentRedirectUrl(referenceId: string, type = 'payment', externalId = referenceId): string {
    const url = new URL('/payment/callback', this.frontendUrl);
    url.searchParams.set('type', type);
    url.searchParams.set('referenceId', referenceId);
    url.searchParams.set('externalId', externalId);
    return url.toString();
  }

  verifyWebhookSignature(headers: MomoWebhookHeaders, rawBody?: Buffer): void {
    if (this.isMockMode && !this.webhookSecret) return;

    if (!this.webhookSecret) {
      throw new UnauthorizedException('MOMO_WEBHOOK_SECRET doit être configuré pour accepter les webhooks MoMo');
    }
    if (!rawBody?.length) {
      throw new UnauthorizedException('Body brut indisponible pour vérifier le webhook MoMo');
    }

    const received = this.getHeader(headers, 'x-momo-signature') || this.getHeader(headers, 'x-signature');
    if (!received) {
      throw new UnauthorizedException('Signature webhook MoMo absente');
    }

    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const normalizedReceived = received.startsWith('sha256=') ? received.slice('sha256='.length) : received;

    if (!this.secureCompare(normalizedReceived, expected)) {
      throw new UnauthorizedException('Signature webhook MoMo invalide');
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.isMockMode) {
      return 'mock-momo-token';
    }

    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60_000) {
      return this.cachedToken.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/collection/token/`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.subscriptionKey || '',
        'X-Target-Environment': this.targetEnvironment,
        'Authorization': `Basic ${Buffer.from(`${this.apiUser}:${this.apiKey}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Erreur d’authentification MoMo: ${response.status} - ${detail}`);
    }

    const data = await response.json();
    const accessToken = data.access_token || data.token || 'mock-momo-token';
    const expiresIn = Number(data.expires_in || 3600);

    this.cachedToken = {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    };

    return accessToken;
  }

  async initiateCollectionPayment(input: InitiateMomoPaymentDto): Promise<MomoPaymentResult> {
    // MTN rejects business IDs such as SUB-<id>: X-Reference-Id must be UUID v4.
    const referenceId = randomUUID();
    const callbackUrl = input.callbackUrl || this.getWebhookUrl('momo/webhook');

    if (this.isMockMode) {
      this.logger.warn(`Mode MoMo simulé activé pour le paiement ${input.externalId}`);
      return {
        status: 'PENDING',
        amount: input.amount,
        currency: input.currency || 'XAF',
        externalId: input.externalId,
        referenceId,
        transactionId: `TXN-${Date.now()}`,
        callbackUrl,
        redirectUrl: this.buildPaymentRedirectUrl(referenceId, this.getRedirectType(input.externalId), input.externalId),
        message: 'Paiement MoMo simulé - aucun appel externe effectué.',
      };
    }

    try {
      const token = await this.getAccessToken();
      const payload = {
        amount: String(input.amount),
        currency: input.currency || 'XAF',
        externalId: input.externalId,
        payer: {
          partyIdType: 'MSISDN',
          partyId: input.payerPhone,
        },
        payerMessage: input.payerMessage || 'Paiement ArtisanConnect',
        payeeNote: input.payeeNote || 'Paiement de commande',
      };

      const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Reference-Id': referenceId,
          'X-Callback-Url': callbackUrl,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey || '',
          'X-Target-Environment': this.targetEnvironment,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const raw = await response.text();
      let parsed: any = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }

      if (!response.ok) {
        this.logger.error(`Erreur MoMo requesttopay: ${response.status} - ${raw}`);
        return {
          status: 'FAILED',
          amount: input.amount,
          currency: input.currency || 'XAF',
          externalId: input.externalId,
          referenceId,
          callbackUrl,
          message: parsed?.message || 'Échec du paiement MoMo',
          rawResponse: parsed,
        };
      }

      return {
        status: 'PENDING',
        amount: input.amount,
        currency: input.currency || 'XAF',
        externalId: input.externalId,
        referenceId,
        callbackUrl,
        redirectUrl: this.buildPaymentRedirectUrl(referenceId, this.getRedirectType(input.externalId), input.externalId),
        message: 'Demande de paiement initiée',
        rawResponse: parsed,
      };
    } catch (error) {
      this.logger.error('Erreur lors de l’initialisation du paiement MoMo', error);
      return {
        status: 'FAILED',
        amount: input.amount,
        currency: input.currency || 'XAF',
        externalId: input.externalId,
        referenceId,
        callbackUrl,
        message: error instanceof Error ? error.message : 'Erreur inconnue MoMo',
      };
    }
  }

  async getPaymentStatus(referenceId: string): Promise<MomoPaymentResult> {
    if (this.isMockMode) {
      return {
        status: 'SUCCESS',
        amount: 0,
        currency: 'XAF',
        externalId: referenceId,
        referenceId,
        message: 'Statut simulé MoMo.',
      };
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/collection/v1_0/requesttopay/${referenceId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Ocp-Apim-Subscription-Key': this.subscriptionKey || '',
          'X-Target-Environment': this.targetEnvironment,
        },
      });

      const raw = await response.text();
      let parsed: any = null;
      try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }

      if (!response.ok) {
        return {
          status: 'FAILED',
          amount: 0,
          currency: 'XAF',
          externalId: referenceId,
          referenceId,
          message: parsed?.message || 'Statut MoMo indisponible',
          rawResponse: parsed,
        };
      }

      return {
        status: this.normalizeStatus(parsed?.status),
        amount: Number(parsed?.amount || 0),
        currency: parsed?.currency || 'XAF',
        externalId: referenceId,
        referenceId,
        message: parsed?.message || 'Statut récupéré',
        rawResponse: parsed,
      };
    } catch (error) {
      this.logger.error(`Erreur de récupération du statut MoMo (${referenceId})`, error);
      return {
        status: 'FAILED',
        amount: 0,
        currency: 'XAF',
        externalId: referenceId,
        referenceId,
        message: error instanceof Error ? error.message : 'Erreur de statut',
      };
    }
  }

  handleWebhook(payload: MomoWebhookPayload): MomoPaymentResult {
    const status = this.normalizeStatus(payload.status);
    const amountValue = Number(payload.amount || 0);

    return {
      status,
      amount: amountValue,
      currency: payload.currency || 'XAF',
      externalId: String(payload.externalId || payload.referenceId || 'unknown'),
      referenceId: payload.referenceId || payload.externalId,
      transactionId: payload.transactionId,
      message: payload.message || 'Webhook MoMo reçu',
      rawResponse: payload,
    };
  }

  normalizeStatus(status: unknown): MomoPaymentStatus {
    const value = String(status || 'PENDING').toUpperCase();
    if (value === 'SUCCESS' || value === 'SUCCESSFUL' || value === 'PAID') return 'SUCCESS';
    if (value === 'FAILED' || value === 'REJECTED' || value === 'CANCELLED') return 'FAILED';
    if (value === 'EXPIRED' || value === 'TIMEOUT') return 'EXPIRED';
    return 'PENDING';
  }

  private getHeader(headers: MomoWebhookHeaders, name: string): string | undefined {
    const value = headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  private secureCompare(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private getRedirectType(referenceId: string): string {
    if (referenceId.startsWith('SUB-') || referenceId.startsWith('RENEW-')) return 'subscription';
    if (referenceId.startsWith('PAYOUT-')) return 'payout';
    return 'payment';
  }
}

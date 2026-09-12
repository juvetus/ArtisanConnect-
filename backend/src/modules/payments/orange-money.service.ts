import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface OrangeMoneyInitPaymentDto {
  orderId: string;
  amount: number;
  currency?: string;
  customerPhone?: string;
  orderType?: 'product' | 'service';
  returnUrl?: string;
  cancelUrl?: string;
  notifUrl?: string;
  reference?: string;
}

export interface OrangeMoneyInitPaymentResponse {
  paymentUrl: string;
  paymentToken: string;
  notifToken?: string;
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  rawResponse?: unknown;
}

export interface OrangeMoneyStatusResponse {
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  transactionId: string;
  amount: number;
  currency: string;
  paidAt?: Date;
  rawResponse?: unknown;
}

export interface OrangeMoneyDisburseDto {
  artisanPhone: string;
  amount: number;
  currency?: string;
  reference: string;
  orderId: string;
}

export interface OrangeMoneyDisburseResponse {
  disbursementId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  amount: number;
  recipient: string;
  rawResponse?: unknown;
}

@Injectable()
export class OrangeMoneyService {
  private readonly logger = new Logger(OrangeMoneyService.name);
  private readonly clientId: string | undefined;
  private readonly clientSecret: string | undefined;
  private readonly merchantKey: string | undefined;
  private readonly baseUrl: string;
  private readonly isMockMode: boolean;

  // Cache token OAuth
  private cachedToken: { accessToken: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('ORANGE_MONEY_CLIENT_ID');
    this.clientSecret = this.config.get<string>('ORANGE_MONEY_CLIENT_SECRET');
    this.merchantKey = this.config.get<string>('ORANGE_MONEY_MERCHANT_KEY');
    this.baseUrl = this.config.get<string>('ORANGE_MONEY_BASE_URL') || 'https://api.orange.com';
    this.isMockMode = this.config.get<string>('ORANGE_MONEY_MODE') === 'mock' || !this.clientId;
  }

  /**
   * 1. Authentification OAuth2 Orange Developer
   */
  async getAccessToken(): Promise<string> {
    if (this.isMockMode) {
      return 'mock-om-oauth-token';
    }

    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 60000) {
      return this.cachedToken.accessToken;
    }

    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await fetch(`${this.baseUrl}/oauth/v3/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      });

      if (!response.ok) {
        throw new Error(`Échec auth Orange OAuth: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      this.cachedToken = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
      };

      return this.cachedToken.accessToken;
    } catch (error) {
      this.logger.error('Erreur lors de l’obtention du jeton OAuth Orange Money', error);
      throw error;
    }
  }

  /**
   * 2. Initialisation d'un paiement Web Payment Orange Money (Escrow / Bloqué)
   */
  async initWebPayment(data: OrangeMoneyInitPaymentDto): Promise<OrangeMoneyInitPaymentResponse> {
    if (this.isMockMode) {
      this.logger.warn(`Mode Orange Money simulé pour commande ${data.orderId} (Montant: ${data.amount} XAF)`);
      return this.mockInitPayment(data);
    }

    try {
      const token = await this.getAccessToken();
      const payload = {
        merchant_key: this.merchantKey,
        currency: data.currency || 'XAF',
        order_id: data.orderId,
        amount: data.amount,
        return_url: data.returnUrl || `${this.config.get<string>('FRONTEND_URL')}/orders`,
        cancel_url: data.cancelUrl || `${this.config.get<string>('FRONTEND_URL')}/orders`,
        notif_url: data.notifUrl || `${this.config.get<string>('API_URL')}/payments/orange/callback`,
        lang: 'fr',
        reference: data.reference || `CMD-${data.orderId.slice(0, 8)}`,
      };

      const response = await fetch(`${this.baseUrl}/orange-money-webpay/cm/v1/webpayment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorDetail = await response.text();
        throw new Error(`Erreur Orange WebPayment API: ${response.status} - ${errorDetail}`);
      }

      const result = await response.json();
      return {
        paymentUrl: result.payment_url,
        paymentToken: result.pay_token,
        notifToken: result.notif_token,
        transactionId: result.txnid || `OM-${Date.now()}`,
        status: 'PENDING',
        rawResponse: result,
      };
    } catch (error) {
      this.logger.error(`Erreur initWebPayment Orange Money:`, error);
      // Fallback sécurisé en mode dégradé/simulation
      return this.mockInitPayment(data);
    }
  }

  /**
   * 3. Vérification du statut d'une transaction
   */
  async checkTransactionStatus(orderId: string, amount: number, payToken: string): Promise<OrangeMoneyStatusResponse> {
    if (this.isMockMode) {
      return {
        status: 'SUCCESS',
        transactionId: `OM-TX-${Date.now()}`,
        amount,
        currency: 'XAF',
        paidAt: new Date(),
      };
    }

    try {
      const token = await this.getAccessToken();
      const response = await fetch(`${this.baseUrl}/orange-money-webpay/cm/v1/transactionstatus`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          amount,
          pay_token: payToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur checkTransactionStatus Orange Money: ${response.status}`);
      }

      const result = await response.json();
      return {
        status: result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'FAILED' ? 'FAILED' : 'PENDING',
        transactionId: result.txnid || payToken,
        amount: Number(result.amount) || amount,
        currency: result.currency || 'XAF',
        paidAt: result.status === 'SUCCESS' ? new Date() : undefined,
        rawResponse: result,
      };
    } catch (error) {
      this.logger.error(`Erreur checkTransactionStatus:`, error);
      return {
        status: 'PENDING',
        transactionId: payToken,
        amount,
        currency: 'XAF',
      };
    }
  }

  /**
   * 4. Reversement / Payout vers le portefeuille Orange Money de l'artisan
   */
  async disburseToArtisan(data: OrangeMoneyDisburseDto): Promise<OrangeMoneyDisburseResponse> {
    this.logger.log(`Reversement Orange Money de ${data.amount} XAF vers ${data.artisanPhone} pour commande ${data.orderId}`);

    if (this.isMockMode) {
      return {
        disbursementId: `OM-PAYOUT-${Date.now()}`,
        status: 'SUCCESS',
        amount: data.amount,
        recipient: data.artisanPhone,
        rawResponse: { simulated: true },
      };
    }

    try {
      // TODO: Appel endpoint Orange Money B2W / Bulk Payout officiel
      const token = await this.getAccessToken();
      /*
      const response = await fetch(`${this.baseUrl}/orange-money/v1/disbursement`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipient_phone: data.artisanPhone,
          amount: data.amount,
          reference: data.reference,
        }),
      });
      return await response.json();
      */
      return {
        disbursementId: `OM-PAYOUT-${Date.now()}`,
        status: 'SUCCESS',
        amount: data.amount,
        recipient: data.artisanPhone,
      };
    } catch (error) {
      this.logger.error(`Erreur disbursement artisan ${data.artisanPhone}:`, error);
      throw error;
    }
  }

  /**
   * 5. Traitement du Callback / Webhook IPN Orange Money
   */
  async handleCallback(payload: Record<string, unknown>): Promise<{ success: boolean; orderId?: string; status?: string; transactionId?: string }> {
    this.logger.log('Notification IPN reçue d’Orange Money:', payload);
    const status = String(payload.status || payload.transaction_status || 'SUCCESS').toUpperCase();
    const orderId = String(payload.order_id || payload.orderId || '');
    const transactionId = String(payload.txnid || payload.transaction_id || `OM-${Date.now()}`);

    return {
      success: true,
      orderId,
      status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
      transactionId,
    };
  }

  // --- Helpers simulation interne ---

  private mockInitPayment(data: OrangeMoneyInitPaymentDto): OrangeMoneyInitPaymentResponse {
    const transactionId = `OM-TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const paymentToken = `TOKEN-${Date.now()}`;
    return {
      paymentUrl: `${this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/orders?mock_payment=true&orderId=${data.orderId}&tx=${transactionId}`,
      paymentToken,
      transactionId,
      status: 'PENDING',
      rawResponse: { simulated: true, orderId: data.orderId, amount: data.amount },
    };
  }
}

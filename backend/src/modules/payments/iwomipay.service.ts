import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type IwomipayStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type IwomipayMethod = 'momo' | 'orange_money' | 'card';

export interface IwomipayCardDetails {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
}

export interface IwomipayPaymentResult {
  externalId: string;
  internalId: string;
  status: IwomipayStatus;
  redirectUrl?: string;
  message?: string;
}

interface IwomipayApiResponse {
  status?: string | number;
  message?: string;
  token?: string;
  external_id?: string;
  internal_id?: string;
  redirectUrl?: string;
}

@Injectable()
export class IwomipayService {
  private readonly username: string | undefined;
  private readonly password: string | undefined;
  private readonly apiKey: string | undefined;
  private readonly apiSecret: string | undefined;
  private readonly baseUrl: string;
  private readonly statusPath: string;
  private readonly callbackUrl: string;
  private readonly frontendUrl: string;
  private readonly isMockMode: boolean;
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {
    this.username = this.config.get<string>('IWOMIPAY_USERNAME');
    this.password = this.config.get<string>('IWOMIPAY_PASSWORD');
    this.apiKey = this.config.get<string>('IWOMIPAY_API_KEY');
    this.apiSecret = this.config.get<string>('IWOMIPAY_API_SECRET');
    this.baseUrl = (this.config.get<string>('IWOMIPAY_BASE_URL')
      || 'https://www.pay.iwomitechnologies.com/api/iwomipay_sandbox').replace(/\/+$/, '');
    this.statusPath = (this.config.get<string>('IWOMIPAY_STATUS_PATH') || 'iwomipayStatus').replace(/^\/+|\/+$/g, '');
    this.callbackUrl = `${(this.config.get<string>('API_URL') || 'http://localhost:3001').replace(/\/+$/, '')}/payments/iwomipay/callback`;
    this.frontendUrl = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/+$/, '');
    const mode = this.config.get<string>('IWOMIPAY_MODE') || 'mock';
    if (mode !== 'mock' && mode !== 'sandbox') {
      throw new BadRequestException('IWOMIPAY_MODE doit être mock ou sandbox');
    }
    this.isMockMode = mode === 'mock';
  }

  async initiatePayment(input: {
    amount: number;
    externalId: string;
    method: IwomipayMethod;
    payerPhone?: string;
    motif: string;
    cardDetails?: IwomipayCardDetails;
  }): Promise<IwomipayPaymentResult> {
    if (!Number.isInteger(input.amount) || input.amount < 100) {
      throw new BadRequestException('Iwomipay exige un montant entier d’au moins 100 FCFA');
    }
    if (!/^[a-zA-Z0-9_-]{1,16}$/.test(input.externalId)) {
      throw new BadRequestException('La référence Iwomipay doit contenir au plus 16 caractères alphanumériques');
    }

    const tel = this.normalizeCameroonPhone(input.payerPhone || '');
    if (input.method === 'card') this.validateCardDetails(input.cardDetails);
    if (this.isMockMode) {
      return {
        externalId: input.externalId,
        internalId: `IWOMI-MOCK-${input.externalId}`,
        status: 'PENDING',
        message: 'Paiement Iwomipay simulé : aucun appel externe effectué.',
      };
    }

    const token = await this.getAccessToken();
    const response = await this.post<IwomipayApiResponse>('iwomipay', {
      country: 'CM',
      amount: String(input.amount),
      motif: input.motif,
      tel,
      op_type: 'debit',
      type: input.method === 'orange_money' ? 'om' : input.method,
      external_id: input.externalId,
      callback_url: this.callbackUrl,
      failed_url: `${this.frontendUrl}/orders`,
      success_url: `${this.frontendUrl}/orders`,
      ...(input.cardDetails ? {
        email: input.cardDetails.email,
        first_name: input.cardDetails.firstName,
        last_name: input.cardDetails.lastName,
        address: input.cardDetails.address,
        city: input.cardDetails.city,
      } : {}),
      apiKey: this.apiKey,
      apiSecret: this.apiSecret,
    }, {
      accountKey: Buffer.from(`${this.apiKey}:${this.apiSecret}`).toString('base64'),
      authorization: `Bearer ${token}`,
    });

    const status = this.parseStatus(response.status);
    const internalId = String(response.internal_id || '').trim();
    const externalId = String(response.external_id || input.externalId).trim();
    if (externalId !== input.externalId) {
      throw new BadGatewayException('La référence de transaction retournée par Iwomipay ne correspond pas');
    }
    if (!internalId) {
      throw new BadGatewayException('Iwomipay n’a pas retourné d’identifiant interne de transaction');
    }

    return {
      externalId,
      internalId,
      status,
      redirectUrl: response.redirectUrl,
      message: response.message,
    };
  }

  async checkTransactionStatus(internalId: string, expectedExternalId: string): Promise<IwomipayPaymentResult> {
    if (!internalId.trim()) {
      throw new BadRequestException('Identifiant interne Iwomipay absent');
    }

    if (this.isMockMode) {
      return {
        externalId: expectedExternalId,
        internalId,
        status: 'PENDING',
      };
    }

    const token = await this.getAccessToken();
    const response = await this.get<IwomipayApiResponse>(
      `${this.statusPath}/${encodeURIComponent(internalId)}`,
      { authorization: `Bearer ${token}` },
    );
    const externalId = String(response.external_id || '').trim();
    if (externalId !== expectedExternalId) {
      throw new BadGatewayException('La référence de transaction retournée par Iwomipay ne correspond pas');
    }
    const returnedInternalId = String(response.internal_id || internalId).trim();
    if (returnedInternalId !== internalId) {
      throw new BadGatewayException('L’identifiant interne retourné par Iwomipay ne correspond pas');
    }

    return {
      externalId,
      internalId: returnedInternalId,
      status: this.parseStatus(response.status),
      message: response.message,
    };
  }

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.value;
    }
    if (!this.username || !this.password || !this.apiKey || !this.apiSecret) {
      throw new BadRequestException('Configurez les quatre identifiants Iwomipay dans les variables d’environnement du backend');
    }

    const response = await this.post<IwomipayApiResponse>('authenticate', {
      username: this.username,
      password: this.password,
    });
    const token = String(response.token || '').trim();
    if (String(response.status) !== '01' || !token) {
      throw new BadGatewayException(response.message || 'Échec de l’authentification Iwomipay');
    }
    this.cachedToken = { value: token, expiresAt: Date.now() + 270_000 };
    return token;
  }

  private async post<T>(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    return this.readResponse<T>(response);
  }

  private async get<T>(path: string, headers: Record<string, string> = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: 'GET',
      headers: { 'content-type': 'application/json', ...headers },
      signal: AbortSignal.timeout(15_000),
    });
    return this.readResponse<T>(response);
  }

  private async readResponse<T>(response: Response): Promise<T> {
    const raw = await response.text();
    let result: unknown;
    try {
      result = raw ? JSON.parse(raw) : null;
    } catch {
      throw new BadGatewayException(`Réponse JSON invalide reçue d’Iwomipay (HTTP ${response.status})`);
    }
    if (!response.ok) {
      const message = result && typeof result === 'object' && 'message' in result
        ? String(result.message)
        : `Iwomipay a répondu avec HTTP ${response.status}`;
      throw new BadGatewayException(message);
    }
    if (!result || typeof result !== 'object') {
      throw new BadGatewayException('Réponse vide ou invalide reçue d’Iwomipay');
    }
    return result as T;
  }

  private parseStatus(status: string | number | undefined): IwomipayStatus {
    switch (String(status)) {
      case '01':
        return 'SUCCESS';
      case '1000':
        return 'PENDING';
      case '100':
        return 'FAILED';
      default:
        throw new BadGatewayException(`Statut Iwomipay non reconnu : ${String(status)}`);
    }
  }

  private normalizeCameroonPhone(phone: string): string {
    let digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 9) digits = `237${digits}`;
    if (!/^237\d{9}$/.test(digits)) {
      throw new BadRequestException('Saisissez un numéro camerounais valide, par exemple 237699000000');
    }
    return digits;
  }

  private validateCardDetails(details?: IwomipayCardDetails): asserts details is IwomipayCardDetails {
    if (!details) throw new BadRequestException('Les coordonnées de facturation sont obligatoires pour un paiement par carte');
    const fields = [details.firstName, details.lastName, details.email, details.address, details.city];
    if (fields.some((field) => !field?.trim())) {
      throw new BadRequestException('Nom, prénom, email, adresse et ville sont requis pour un paiement par carte');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email)) {
      throw new BadRequestException('Adresse email invalide pour le paiement par carte');
    }
  }
}

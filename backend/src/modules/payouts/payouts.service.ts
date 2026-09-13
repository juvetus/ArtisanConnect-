import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payout } from '../../entities/index.js';
import { MomoService } from '../momo/momo.service.js';

@Injectable()
export class PayoutsService {
  constructor(
    @InjectRepository(Payout)
    private payoutRepository: Repository<Payout>,
    private momoService: MomoService,
  ) {}

  async createPayout(artisanId: string, amount: number, recipientPhone: string, orderId?: string): Promise<Payout> {
    const payout = this.payoutRepository.create({
      artisanId,
      orderId: orderId || null,
      amount,
      currency: 'XAF',
      status: 'pending',
      provider: 'momo',
      recipientPhone,
    });

    const saved = await this.payoutRepository.save(payout);

    const result = await this.momoService.initiateCollectionPayment({
      orderId: `PAYOUT-${saved.id}`,
      amount,
      currency: 'XAF',
      externalId: `PAYOUT-${saved.id}`,
      payerPhone: recipientPhone,
      callbackUrl: this.momoService.getWebhookUrl('payouts/webhook'),
      payerMessage: 'Versement ArtisanConnect',
      payeeNote: 'Versement artisan',
    });

    saved.status = result.status === 'SUCCESS' ? 'success' : 'failed';
    saved.providerReference = result.referenceId || saved.providerReference;
    return this.payoutRepository.save(saved);
  }

  async findByArtisan(artisanId: string): Promise<Payout[]> {
    return this.payoutRepository.find({ where: { artisanId } });
  }

  async findById(id: string): Promise<Payout | null> {
    return this.payoutRepository.findOne({ where: { id } });
  }

  async handleMomoPayoutWebhook(body: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const payload = this.momoService.handleWebhook(body);
    const externalId = String(payload.externalId || payload.referenceId || '').trim();
    const status = payload.status;

    if (!externalId) {
      return { success: false, message: 'Référence de payout absente' };
    }

    const payoutId = externalId.startsWith('PAYOUT-') ? externalId.replace('PAYOUT-', '') : externalId;
    const payout = await this.payoutRepository.findOne({ where: { id: payoutId } });
    if (!payout) {
      throw new NotFoundException(`Versement introuvable ${payoutId}`);
    }

    if (status === 'SUCCESS') {
      payout.status = 'success';
      payout.providerReference = String(payload.transactionId || payout.providerReference || payout.id);
      await this.payoutRepository.save(payout);
      return { success: true, message: 'Versement artisan validé' };
    }

    if (status === 'FAILED' || status === 'EXPIRED') {
      payout.status = 'failed';
      await this.payoutRepository.save(payout);
      return { success: true, message: 'Versement artisan rejeté' };
    }

    return { success: true, message: 'Webhook de payout reçu en attente' };
  }
}

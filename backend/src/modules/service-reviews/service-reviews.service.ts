import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceReview } from '../../entities/service-review.entity.js';
import { ServiceOrder } from '../../entities/service-order.entity.js';

@Injectable()
export class ServiceReviewsService {
  constructor(
    @InjectRepository(ServiceReview) private readonly reviews: Repository<ServiceReview>,
    @InjectRepository(ServiceOrder) private readonly orders: Repository<ServiceOrder>,
  ) {}

  async create(reviewerId: string, data: { orderId: string; rating: number; comment?: string }) {
    if (!Number.isInteger(data.rating) || data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('La note doit être comprise entre 1 et 5');
    }
    const comment = data.comment?.trim() || null;
    if (data.rating <= 2 && !comment) {
      throw new BadRequestException('Un commentaire est obligatoire pour une note de 1 ou 2');
    }
    const order = await this.orders.findOne({ where: { id: data.orderId } });
    if (!order) throw new NotFoundException('Commande de service introuvable');
    if (order.status !== 'completed') throw new BadRequestException('La commande doit être terminée pour être évaluée');
    const isClient = order.clientId === reviewerId;
    const isArtisan = order.artisanId === reviewerId;
    if (!isClient && !isArtisan) throw new ForbiddenException('Cette commande ne vous concerne pas');
    const recipientId = isClient ? order.artisanId : order.clientId;
    const existing = await this.reviews.findOne({ where: { orderId: data.orderId, reviewerId } });
    if (existing) throw new ConflictException('Vous avez déjà évalué cette commande');
    return this.reviews.save(this.reviews.create({
      orderId: data.orderId,
      serviceId: order.serviceId,
      reviewerId,
      recipientId,
      rating: data.rating,
      comment,
      verified: true,
    }));
  }

  findByOrder(orderId: string, reviewerId: string) {
    return this.reviews.findOne({ where: { orderId, reviewerId } });
  }

  findByService(serviceId: string, skip = 0, take = 20) {
    return this.reviews.findAndCount({
      where: { serviceId },
      relations: { reviewer: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findByRecipient(recipientId: string, skip = 0, take = 20) {
    return this.reviews.findAndCount({
      where: { recipientId },
      relations: { reviewer: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async getRecipientRating(recipientId: string) {
    const result = await this.reviews.createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.recipientId = :recipientId', { recipientId })
      .getRawOne();
    return { average: result?.average ? Number(Number(result.average).toFixed(1)) : null, count: Number(result?.count ?? 0) };
  }

  async getServiceRating(serviceId: string) {
    const result = await this.reviews.createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.serviceId = :serviceId', { serviceId })
      .getRawOne();
    return { average: result?.average ? Number(Number(result.average).toFixed(1)) : null, count: Number(result?.count ?? 0) };
  }
}

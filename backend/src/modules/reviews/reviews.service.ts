import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, Review } from '../../entities/index.js';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewsRepository: Repository<Review>,
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
  ) {}

  /** Un avis n'est possible que par l'acheteur, une fois la commande terminée. */
  async createForOrder(
    reviewerId: string,
    orderId: string,
    rating: number,
    comment: string,
  ): Promise<Review> {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new BadRequestException('La note doit être comprise entre 1 et 5');
    }

    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.buyerId !== reviewerId) {
      throw new ForbiddenException("Seul l'acheteur peut évaluer cette commande");
    }
    if (order.status !== 'completed') {
      throw new BadRequestException('La commande doit être terminée pour être évaluée');
    }

    const existing = await this.reviewsRepository.findOne({ where: { orderId } });
    if (existing) throw new ConflictException('Cette commande a déjà été évaluée');

    return this.reviewsRepository.save(
      this.reviewsRepository.create({
        orderId,
        reviewerId,
        recipientId: order.sellerId,
        rating,
        comment,
        verified: true,
      }),
    );
  }

  async findByOrder(orderId: string): Promise<Review | null> {
    return this.reviewsRepository.findOne({ where: { orderId } });
  }

  async findByRecipient(recipientId: string, skip = 0, take = 20): Promise<[Review[], number]> {
    return this.reviewsRepository.findAndCount({
      where: { recipientId },
      relations: { reviewer: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  async getAverageRating(recipientId: string) {
    const result = await this.reviewsRepository
      .createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.recipientId = :recipientId', { recipientId })
      .getRawOne();

    return {
      average: result?.average ? Number(Number(result.average).toFixed(1)) : null,
      count: Number(result?.count ?? 0),
    };
  }
}



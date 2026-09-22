import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from '../../entities/service.entity.js';
import { User } from '../../entities/user.entity.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EmailService } from '../email/email.service.js';
import { ServiceReview } from '../../entities/service-review.entity.js';
import { ServiceValidationHistory, type ServiceValidationAction } from '../../entities/service-validation-history.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/** Recherche insensible aux accents sans dépendre de l'extension Postgres `unaccent`. */
function unaccent(column: string): string {
  return `translate(lower(coalesce(${column}, '')), 'àáâãäçèéêëìíîïñòóôõöùúûüýÿ', 'aaaaaceeeeiiiinooooouuuuyy')`;
}

function normalizeSearchValue(value?: string | null): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service) private readonly servicesRepository: Repository<Service>,
    @InjectRepository(ServiceReview) private readonly reviewsRepository: Repository<ServiceReview>,
    @InjectRepository(ServiceValidationHistory) private readonly validationHistoryRepository: Repository<ServiceValidationHistory>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createService(artisanId: string, data: {
    title: string;
    description: string;
    price?: number;
    priceMin?: number;
    priceMax?: number;
    estimatedDays: number;
    category: string;
    tags?: string[];
    fileUrls?: string[];
    videoUrls?: string[];
    externalUrls?: string[];
  }) {
    const service = this.servicesRepository.create({
      ...data,
      artisan: { id: artisanId } as User,
      status: 'draft',
    });
    return this.servicesRepository.save(service);
  }

  async publishService(artisanId: string, serviceId: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId, artisan: { id: artisanId } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    service.status = 'pending_validation';
    const savedService = await this.servicesRepository.save(service);

    // Prévenir chaque administrateur sans bloquer la soumission si une notification échoue.
    try {
      const [admins, artisan] = await Promise.all([
        this.usersRepository.find({ where: { role: 'admin', isActive: true } }),
        this.usersRepository.findOne({ where: { id: artisanId } }),
      ]);
      const artisanName = artisan?.name || 'Un artisan';
      await Promise.all(admins.map((admin) => this.notificationsService.notify({
        recipientId: admin.id,
        type: 'service_review',
        title: 'Nouveau service à valider',
        content: `${artisanName} a soumis le service « ${savedService.title} » pour validation.`,
        link: '/admin/services',
        relatedId: savedService.id,
      })));
    } catch {
      // La notification ne doit pas annuler la soumission du service.
    }

    return savedService;
  }

  async getMyServices(artisanId: string) {
    return this.servicesRepository.find({
      where: { artisan: { id: artisanId } },
      order: { createdAt: 'DESC' },
    });
  }

  async getServiceById(serviceId: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId },
      relations: { artisan: true, validatedBy: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return this.withRating(service);
  }

  async updateService(artisanId: string, serviceId: string, data: Partial<{
    title: string;
    description: string;
    price?: number;
    priceMin?: number;
    priceMax?: number;
    estimatedDays: number;
    category: string;
    tags?: string[];
    fileUrls?: string[];
    videoUrls?: string[];
    externalUrls?: string[];
  }>) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId, artisan: { id: artisanId } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Only allow updates if service is in draft or validation_requested status
    if (service.status !== 'draft' && service.status !== 'validation_requested') {
      throw new ForbiddenException('Cannot update service in current status');
    }

    Object.assign(service, data);
    return this.servicesRepository.save(service);
  }

  async deleteService(artisanId: string, serviceId: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId, artisan: { id: artisanId } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Only allow deletion if service is in draft status
    if (service.status !== 'draft') {
      throw new ForbiddenException('Cannot delete service in current status');
    }

    await this.servicesRepository.delete(serviceId);
    return { message: 'Service deleted successfully' };
  }

  async getApprovedServices(
    limit: number = 20,
    skip: number = 0,
    filters: { q?: string; category?: string; city?: string } = {},
  ) {
    const builder = this.servicesRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.artisan', 'artisan')
      .where('service.status = :status', { status: 'approved' });

    const query = normalizeSearchValue(filters.q);
    if (query) {
      builder.andWhere(
        `(${unaccent('service.title')} LIKE :q OR ${unaccent('service.description')} LIKE :q OR ${unaccent('service.tags')} LIKE :q)`,
        { q: `%${query}%` },
      );
    }

    if (filters.category) builder.andWhere('service.category = :category', { category: filters.category });

    const city = normalizeSearchValue(filters.city);
    if (city) {
      // La ville d'un artisan vient soit de son profil, soit d'une de ses boutiques actives.
      builder.andWhere(
        `(${unaccent('artisan.location')} LIKE :city OR EXISTS (
          SELECT 1 FROM shops shop
          WHERE shop."sellerId" = artisan.id AND shop.status = 'active'
            AND (${unaccent('shop.city')} LIKE :city OR ${unaccent('shop.neighborhood')} LIKE :city)
        ))`,
        { city: `%${city}%` },
      );
    }

    const services = await builder.orderBy('service.createdAt', 'DESC').take(limit).skip(skip).getMany();
    return Promise.all(services.map((service) => this.withRating(service)));
  }

  private async withRating<T extends Service>(service: T) {
    const result = await this.reviewsRepository.createQueryBuilder('review')
      .select('AVG(review.rating)', 'average')
      .addSelect('COUNT(review.id)', 'count')
      .where('review.serviceId = :serviceId', { serviceId: service.id })
      .getRawOne();
    return { ...service, averageRating: result?.average ? Number(Number(result.average).toFixed(1)) : null, reviewCount: Number(result?.count ?? 0) };
  }

  async searchApprovedServices(query: string, category?: string, limit: number = 20) {
    let qb = this.servicesRepository
      .createQueryBuilder('service')
      .where('service.status = :status', { status: 'approved' })
      .leftJoinAndSelect('service.artisan', 'artisan');

    if (query) {
      qb = qb.andWhere(
        '(service.title ILIKE :query OR service.description ILIKE :query OR service.tags ILIKE :query)',
        { query: `%${query}%` },
      );
    }

    if (category) {
      qb = qb.andWhere('service.category = :category', { category });
    }

    return qb.orderBy('service.createdAt', 'DESC').take(limit).getMany();
  }

  async getServicesByCategory(category: string) {
    return this.servicesRepository.find({
      where: { status: 'approved', category },
      relations: { artisan: true },
      order: { createdAt: 'DESC' },
    });
  }

  // Admin methods
  async getPendingValidationServices() {
    return this.servicesRepository.find({
      where: { status: 'pending_validation' },
      relations: { artisan: true },
      order: { createdAt: 'ASC' },
    });
  }

  async getValidationRequestedServices() {
    return this.servicesRepository.find({
      where: { status: 'validation_requested' },
      relations: { artisan: true },
      order: { revisionDueAt: 'ASC' },
    });
  }

  async approveService(adminId: string, serviceId: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId },
      relations: { artisan: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const previousStatus = service.status;
    service.status = 'approved';
    service.validatedBy = { id: adminId } as User;
    service.validatedAt = new Date();
    const savedService = await this.servicesRepository.save(service);
    await this.recordValidationHistory(serviceId, adminId, 'approved', previousStatus, 'approved');
    await this.emailService.sendServiceStatusEmail({
      to: service.artisan.email,
      artisanName: service.artisan.name,
      serviceTitle: service.title,
      status: 'approved',
      serviceUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/artisan/services`,
    });
    return savedService;
  }

  async rejectService(adminId: string, serviceId: string, feedback: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId },
      relations: { artisan: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const previousStatus = service.status;
    service.status = 'rejected';
    service.validationFeedback = feedback;
    service.validatedBy = { id: adminId } as User;
    service.validatedAt = new Date();
    const savedService = await this.servicesRepository.save(service);
    await this.recordValidationHistory(serviceId, adminId, 'rejected', previousStatus, 'rejected', feedback);
    await this.emailService.sendServiceStatusEmail({
      to: service.artisan.email,
      artisanName: service.artisan.name,
      serviceTitle: service.title,
      status: 'rejected',
      feedback,
      serviceUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/artisan/services`,
    });
    return savedService;
  }

  async requestValidationRevision(adminId: string, serviceId: string, feedback: string) {
    const service = await this.servicesRepository.findOne({
      where: { id: serviceId },
      relations: { artisan: true },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    // Set 48h deadline for revision
    const revisionDueAt = new Date();
    revisionDueAt.setHours(revisionDueAt.getHours() + 48);

    const previousStatus = service.status;
    service.status = 'validation_requested';
    service.validationFeedback = feedback;
    service.revisionDueAt = revisionDueAt;
    const savedService = await this.servicesRepository.save(service);
    await this.recordValidationHistory(serviceId, adminId, 'revision_requested', previousStatus, 'validation_requested', feedback);
    await this.emailService.sendServiceStatusEmail({
      to: service.artisan.email,
      artisanName: service.artisan.name,
      serviceTitle: service.title,
      status: 'revision_requested',
      feedback,
      serviceUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/artisan/services`,
    });
    return savedService;
  }

  /**
   * Auto-reject services where the 48h revision deadline has passed
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async autoRejectOverdueRevisions() {
    const now = new Date();
    const overdueServices = await this.servicesRepository.find({
      where: { 
        status: 'validation_requested',
      },
      relations: { artisan: true },
    });

    for (const service of overdueServices) {
      if (service.revisionDueAt && service.revisionDueAt <= now) {
        const previousStatus = service.status;
        service.status = 'rejected';
        service.validationFeedback = `${service.validationFeedback || 'Modifications demandées'} - Auto-rejeté : délai de 48h dépassé`;
        await this.servicesRepository.save(service);
        await this.recordValidationHistory(service.id, null, 'auto_rejected', previousStatus, 'rejected', service.validationFeedback);
        await this.emailService.sendServiceStatusEmail({
          to: service.artisan.email,
          artisanName: service.artisan.name,
          serviceTitle: service.title,
          status: 'rejected',
          feedback: service.validationFeedback,
          serviceUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/artisan/services`,
        });
      }
    }
  }

  async getValidationHistory(skip = 0, take = 50) {
    return this.validationHistoryRepository.find({
      relations: { service: true, admin: true },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  private recordValidationHistory(
    serviceId: string,
    adminId: string | null,
    action: ServiceValidationAction,
    previousStatus: string | null,
    newStatus: string,
    feedback?: string | null,
  ) {
    return this.validationHistoryRepository.save(this.validationHistoryRepository.create({
      serviceId,
      adminId,
      action,
      previousStatus,
      newStatus,
      feedback: feedback ?? null,
      service: { id: serviceId } as Service,
      ...(adminId ? { admin: { id: adminId } as User } : {}),
    }));
  }

  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats() {
    const [pendingCount, pendingServices] = await Promise.all([
      this.servicesRepository.count({
        where: { status: 'pending_validation' },
      }),
      this.servicesRepository.find({
        where: { status: 'pending_validation' },
        relations: { artisan: true },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const [revisionCount, revisionServices] = await Promise.all([
      this.servicesRepository.count({
        where: { status: 'validation_requested' },
      }),
      this.servicesRepository.find({
        where: { status: 'validation_requested' },
        relations: { artisan: true },
        order: { revisionDueAt: 'ASC' },
      }),
    ]);

    const [approvedCount] = await Promise.all([
      this.servicesRepository.count({
        where: { status: 'approved' },
      }),
    ]);

    const [rejectedCount] = await Promise.all([
      this.servicesRepository.count({
        where: { status: 'rejected' },
      }),
    ]);

    // Calculate average validation time (for approved services)
    const approvedWithTimestamps = await this.servicesRepository.find({
      where: { status: 'approved' },
    });

    let avgValidationTime = 0;
    if (approvedWithTimestamps.length > 0) {
      const totalTime = approvedWithTimestamps.reduce((sum, service) => {
        if (service.validatedAt) {
          return sum + (service.validatedAt.getTime() - service.createdAt.getTime());
        }
        return sum;
      }, 0);
      avgValidationTime = Math.round(totalTime / approvedWithTimestamps.length / (1000 * 60 * 60)); // in hours
    }

    return {
      stats: {
        pendingValidationCount: pendingCount,
        validationRequestedCount: revisionCount,
        approvedCount,
        rejectedCount,
        avgValidationTimeHours: avgValidationTime,
      },
      pendingServices: pendingServices.map(s => ({
        id: s.id,
        title: s.title,
        artisanName: s.artisan?.name || 'Unknown',
        createdAt: s.createdAt,
        category: s.category,
      })),
      revisionServices: revisionServices.map(s => ({
        id: s.id,
        title: s.title,
        artisanName: s.artisan?.name || 'Unknown',
        revisionDueAt: s.revisionDueAt,
        category: s.category,
        feedback: s.validationFeedback,
      })),
    };
  }

  async exportServicesCsv() {
    const services = await this.servicesRepository.find({
      relations: { artisan: true },
      order: { createdAt: 'DESC' },
    });
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['id', 'titre', 'artisan', 'categorie', 'statut', 'prix', 'jours_estimes', 'cree_le', 'valide_le'];
    const rows = services.map((service) => [
      service.id,
      service.title,
      service.artisan?.name,
      service.category,
      service.status,
      service.price,
      service.estimatedDays,
      service.createdAt.toISOString(),
      service.validatedAt?.toISOString(),
    ]);
    return [header, ...rows].map((row) => row.map(escape).join(';')).join('\n');
  }
}

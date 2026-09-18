import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report, type ReportReason, type ReportStatus, type ReportTargetType } from '../../entities/report.entity.js';
import { User } from '../../entities/user.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

const TARGET_TYPES: ReportTargetType[] = ['listing', 'shop', 'user', 'review'];
const REASONS: ReportReason[] = ['fraud', 'inappropriate', 'counterfeit', 'spam', 'wrong_info', 'other'];

/** Un même utilisateur ne peut pas saturer la modération avec le même signalement. */
const MAX_OPEN_REPORTS_PER_REPORTER = 10;

@Injectable()
export class ModerationService {
  constructor(
    @InjectRepository(Report) private reports: Repository<Report>,
    @InjectRepository(User) private users: Repository<User>,
    private notifications: NotificationsService,
  ) {}

  async create(
    reporterId: string,
    data: { targetType: ReportTargetType; targetId: string; reason: ReportReason; details?: string },
  ): Promise<Report> {
    if (!TARGET_TYPES.includes(data.targetType)) throw new BadRequestException('Type de contenu signalé invalide');
    if (!REASONS.includes(data.reason)) throw new BadRequestException('Motif de signalement invalide');
    if (!data.targetId?.trim()) throw new BadRequestException('Contenu signalé introuvable');

    const duplicate = await this.reports.findOne({
      where: { reporterId, targetType: data.targetType, targetId: data.targetId, status: 'open' },
    });
    if (duplicate) throw new BadRequestException('Vous avez déjà signalé ce contenu ; notre équipe l’examine.');

    const openCount = await this.reports.count({ where: { reporterId, status: 'open' } });
    if (openCount >= MAX_OPEN_REPORTS_PER_REPORTER) {
      throw new BadRequestException('Trop de signalements en attente. Attendez le traitement des précédents.');
    }

    const report = await this.reports.save(
      this.reports.create({
        reporterId,
        targetType: data.targetType,
        targetId: data.targetId.trim(),
        reason: data.reason,
        details: data.details?.trim() ?? '',
      }),
    );

    const admins = await this.users.find({ where: { role: 'admin' } });
    for (const admin of admins) {
      await this.notifications.notify({
        recipientId: admin.id,
        type: 'general',
        title: 'Nouveau signalement à modérer',
        content: `${data.targetType} signalé pour « ${data.reason} ».`,
        link: '/admin',
        relatedId: report.id,
      });
    }

    return report;
  }

  findMine(reporterId: string): Promise<Report[]> {
    return this.reports.find({ where: { reporterId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  findForModeration(status?: ReportStatus): Promise<Report[]> {
    return this.reports.find({
      where: status ? { status } : {},
      relations: { reporter: true },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async moderate(id: string, moderatorId: string, status: ReportStatus, notes?: string): Promise<Report | null> {
    if (!['open', 'reviewing', 'resolved', 'dismissed'].includes(status)) {
      throw new BadRequestException('Statut de modération invalide');
    }
    const report = await this.reports.findOne({ where: { id } });
    if (!report) throw new NotFoundException('Signalement introuvable');

    await this.reports.update(id, {
      status,
      moderatorId,
      moderatorNotes: notes?.trim() ?? report.moderatorNotes,
      resolvedAt: status === 'resolved' || status === 'dismissed' ? new Date() : null,
    });

    await this.notifications.notify({
      recipientId: report.reporterId,
      type: 'general',
      title: status === 'resolved' ? 'Votre signalement a été traité' : 'Mise à jour de votre signalement',
      content:
        status === 'resolved'
          ? 'Merci : notre équipe a pris une mesure sur le contenu signalé.'
          : status === 'dismissed'
            ? 'Après vérification, aucune infraction n’a été retenue.'
            : 'Votre signalement est en cours d’examen.',
      link: '/notifications',
      relatedId: report.id,
    });

    return this.reports.findOne({ where: { id } });
  }
}

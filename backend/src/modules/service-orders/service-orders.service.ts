import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ServiceOrder, type ServiceOrderStatus } from '../../entities/service-order.entity.js';
import { Service } from '../../entities/service.entity.js';
import { ServiceQuote } from '../../entities/service-quote.entity.js';
import { User } from '../../entities/user.entity.js';
import { ServicePayment } from '../../entities/service-payment.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { EmailService } from '../email/email.service.js';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsAppService } from '../whatsapp/whatsapp.service.js';

const PLATFORM_FEE_RATE = 0.10;

@Injectable()
export class ServiceOrdersService {
  constructor(
    @InjectRepository(ServiceOrder)
    private readonly ordersRepository: Repository<ServiceOrder>,
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
    @InjectRepository(ServiceQuote)
    private readonly quotesRepository: Repository<ServiceQuote>,
    @InjectRepository(ServicePayment)
    private readonly paymentsRepository: Repository<ServicePayment>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async createOrder(clientId: string, data: {
    serviceId: string;
    projectObjective: string;
    options?: Record<string, unknown>;
    inspirationLinks?: string;
    budgetMin?: number;
    budgetMax?: number;
    requestedDate?: string;
    deliveryMethod: 'home' | 'workshop' | 'carrier';
    deliveryAddress?: string;
    deliveryLatitude?: number;
    deliveryLongitude?: number;
    fileUrls?: string[];
    clientConfirmed: boolean;
    termsAccepted: boolean;
  }) {
    if (!data.projectObjective?.trim() || data.projectObjective.trim().length < 50) {
      throw new BadRequestException('Le besoin doit contenir au moins 50 caractères');
    }
    if (!data.clientConfirmed || !data.termsAccepted) {
      throw new BadRequestException('Les confirmations client sont obligatoires');
    }
    if (!['home', 'workshop', 'carrier'].includes(data.deliveryMethod)) {
      throw new BadRequestException('Mode de livraison invalide');
    }
    if (data.deliveryMethod !== 'workshop' && !data.deliveryAddress?.trim()) {
      throw new BadRequestException('Une adresse est obligatoire pour ce mode de livraison');
    }

    const service = await this.servicesRepository.findOne({
      where: { id: data.serviceId, status: 'approved' },
      relations: { artisan: true },
    });
    if (!service) throw new NotFoundException('Service approuvé introuvable');
    if (service.artisan.id === clientId) {
      throw new ForbiddenException('Vous ne pouvez pas commander votre propre service');
    }

    const activeStatuses: ServiceOrderStatus[] = ['pending_admin_validation', 'details_requested', 'sent_to_artisan', 'quote_pending', 'accepted', 'in_progress', 'delivered', 'disputed'];
    const savedOrder = await this.ordersRepository.manager.transaction(async (transaction) => {
      const lockedService = await transaction.findOne(Service, {
        where: { id: service.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedService || lockedService.status !== 'approved') {
        throw new NotFoundException('Service approuvé introuvable');
      }

      const orderRepository = transaction.getRepository(ServiceOrder);
      const existingOrder = await orderRepository.count({
        where: { clientId, serviceId: service.id, status: In(activeStatuses) },
      });
      if (existingOrder > 0) {
        throw new ConflictException('Vous avez déjà une demande active pour ce service. Terminez-la ou annulez-la avant d’en créer une nouvelle.');
      }

      const order = orderRepository.create({
        clientId,
        artisanId: service.artisan.id,
        serviceId: service.id,
        projectObjective: data.projectObjective.trim(),
        options: data.options ?? {},
        inspirationLinks: data.inspirationLinks?.trim() || null,
        budgetMin: data.budgetMin ?? null,
        budgetMax: data.budgetMax ?? null,
        platformFee: 0,
        requestedDate: data.requestedDate ? new Date(data.requestedDate) : null,
        deliveryMethod: data.deliveryMethod,
        deliveryAddress: data.deliveryMethod !== 'workshop' ? data.deliveryAddress!.trim() : null,
        deliveryLatitude: data.deliveryMethod !== 'workshop' ? data.deliveryLatitude ?? null : null,
        deliveryLongitude: data.deliveryMethod !== 'workshop' ? data.deliveryLongitude ?? null : null,
        fileUrls: data.fileUrls ?? [],
        status: 'pending_admin_validation',
        clientConfirmed: data.clientConfirmed,
        termsAccepted: data.termsAccepted,
      });
      return orderRepository.save(order);
    });

    const requestSummary = `Nouvelle demande pour « ${service.title} ». Elle sera transmise après validation de l’équipe ArtisanConnect.`;
    const artisanUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/artisan/service-orders`;
    try {
      await this.notificationsService.notify({
        recipientId: service.artisan.id,
        type: 'new_order',
        title: 'Nouvelle demande pour votre service',
        content: requestSummary,
        link: '/artisan/service-orders',
        relatedId: savedOrder.id,
      });
    } catch {
      // Une notification ne doit pas annuler la demande.
    }
    if (service.artisan.email) {
      await this.emailService.send({
        to: service.artisan.email,
        subject: `[ArtisanConnect] Nouvelle demande pour ${service.title}`,
        text: `Bonjour ${service.artisan.name ?? ''},\n\n${requestSummary}\n\nConsulter : ${artisanUrl}`,
        html: `<p>Bonjour ${this.escapeHtml(service.artisan.name ?? '')},</p><p>${this.escapeHtml(requestSummary)}</p><p><a href="${this.escapeHtml(artisanUrl)}">Consulter la demande</a></p>`,
      }).catch(() => undefined);
    }
    await this.whatsAppService.sendServiceRequest(service.artisan.whatsappPhone ?? service.artisan.phone, [
      service.artisan.name ?? 'Artisan',
      `Nouvelle demande pour le service « ${service.title} ». ${requestSummary}`,
      artisanUrl,
    ]);

    const admins = await this.usersRepository.find({ where: { role: 'admin' } });
    await Promise.all(admins.map(async (admin) => {
      try {
        await this.notificationsService.notify({
          recipientId: admin.id,
          type: 'new_order',
          title: 'Nouvelle demande de service à valider',
          content: `Une nouvelle demande pour « ${service.title} » attend votre validation.`,
          link: `/admin/service-orders`,
          relatedId: savedOrder.id,
        });
        await this.emailService.send({
          to: admin.email,
          subject: '[ArtisanConnect] Nouvelle demande de service à valider',
          text: `Une nouvelle demande pour « ${service.title} » attend votre validation.\n\nConsulter : ${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/admin/service-orders`,
          html: `<p>Une nouvelle demande pour <strong>${this.escapeHtml(service.title)}</strong> attend votre validation.</p><p><a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/admin/service-orders">Ouvrir les demandes à valider</a></p>`,
        });
      } catch {
        // Une notification ou un e-mail admin ne doit pas annuler la demande.
      }
    }));
    return this.findByIdForUser(savedOrder.id, clientId);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>\"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '\"': '&quot;',
      "'": '&#039;',
    })[character] ?? character);
  }

  async findByIdForUser(id: string, userId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { client: true, artisan: true, service: true },
    });
    if (!order) throw new NotFoundException('Demande introuvable');
    if (order.clientId !== userId && order.artisanId !== userId) {
      throw new ForbiddenException('Cette demande ne vous concerne pas');
    }
    return order;
  }

  async attachFiles(userId: string, orderId: string, fileUrls: string[]) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande de service introuvable');
    if (order.clientId !== userId && order.artisanId !== userId) {
      throw new ForbiddenException('Cette commande ne vous concerne pas');
    }
    order.fileUrls = [...new Set([...(order.fileUrls ?? []), ...fileUrls])];
    return this.ordersRepository.save(order);
  }

  findByClient(clientId: string) {
    return this.ordersRepository.find({
      where: { clientId },
      relations: { artisan: true, service: true },
      order: { createdAt: 'DESC' },
    });
  }

  findByArtisan(artisanId: string) {
    return this.ordersRepository.find({
      where: { artisanId },
      relations: { client: true, service: true },
      order: { createdAt: 'ASC' },
    });
  }

  findPendingForAdmin() {
    return this.ordersRepository.find({
      where: { status: 'pending_admin_validation' },
      relations: { client: true, artisan: true, service: true },
      order: { createdAt: 'ASC' },
    });
  }

  async updateAdminStatus(adminId: string, id: string, status: Extract<ServiceOrderStatus, 'sent_to_artisan' | 'rejected' | 'details_requested'>, feedback?: string) {
    const order = await this.ordersRepository.findOne({
      where: { id, status: 'pending_admin_validation' },
      relations: { client: true, artisan: true, service: true },
    });
    if (!order) throw new NotFoundException('Demande en attente introuvable');

    if (status !== 'sent_to_artisan' && !feedback?.trim()) {
      throw new BadRequestException('Un feedback est requis');
    }

    order.status = status;
    order.adminFeedback = feedback?.trim() || null;
    const savedOrder = await this.ordersRepository.save(order);

    try {
      await this.notificationsService.notify({
        recipientId: status === 'sent_to_artisan' ? order.artisanId : order.clientId,
        type: 'order_status',
        title: status === 'sent_to_artisan' ? 'Votre demande a été transmise' : 'Mise à jour de votre demande',
        content: feedback || 'Votre demande de service a été mise à jour.',
        link: `/service-orders/${order.id}`,
        relatedId: order.id,
      });
    } catch {
      // Une notification ne doit pas annuler la décision admin.
    }

    return savedOrder;
  }

  async proposeQuote(artisanId: string, orderId: string, data: {
    proposedPrice: number;
    proposedDays: number;
    details: string;
    items?: { description: string; quantity: number; unitPrice: number }[];
    terms?: string;
  }) {
    const items = (data.items ?? []).map((item) => ({ description: item.description.trim(), quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
    if (items.some((item) => !item.description || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
      throw new BadRequestException('Les lignes du devis sont invalides');
    }
    const calculatedTotal = items.length ? Math.round(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)) : Number(data.proposedPrice);
    if (!Number.isFinite(calculatedTotal) || calculatedTotal <= 0) {
      throw new BadRequestException('Le prix proposé doit être supérieur à zéro');
    }
    if (!Number.isInteger(data.proposedDays) || data.proposedDays < 1) {
      throw new BadRequestException('Le délai proposé est invalide');
    }
    if (!data.details?.trim()) {
      throw new BadRequestException('Le détail du devis est obligatoire');
    }

    const order = await this.ordersRepository.findOne({
      where: { id: orderId, artisanId },
      relations: { client: true },
    });
    if (!order) throw new NotFoundException('Demande artisan introuvable');
    if (order.status !== 'sent_to_artisan' && order.status !== 'quote_pending') {
      throw new BadRequestException('Cette demande ne peut pas recevoir de devis');
    }

    const existingQuote = await this.quotesRepository.findOne({
      where: { orderId, status: 'pending' },
    });
    if (existingQuote) throw new BadRequestException('Un devis est déjà en attente de réponse');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 5);
    const quoteNumber = `DEV-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const quote = this.quotesRepository.create({
      orderId,
      artisanId,
      quoteNumber,
      currency: 'XAF',
      proposedPrice: calculatedTotal,
      proposedDays: data.proposedDays,
      details: data.details.trim(),
      items,
      terms: data.terms?.trim() || null,
      status: 'pending',
      clientResponse: null,
      expiresAt,
      order: { id: orderId } as ServiceOrder,
      artisan: { id: artisanId } as User,
    });
    order.status = 'quote_pending';
    await this.ordersRepository.save(order);
    const savedQuote = await this.quotesRepository.save(quote);

    try {
      await this.notificationsService.notify({
        recipientId: order.clientId,
        type: 'order_status',
        title: 'Nouveau devis reçu',
        content: `L'artisan a proposé ${data.proposedPrice} FCFA pour votre demande. Vous avez 5 jours pour répondre.`,
        link: `/service-orders/${order.id}`,
        relatedId: order.id,
      });
      await this.emailService.sendQuoteEmail({
        to: order.client.email,
        recipientName: order.client.name,
        serviceTitle: 'votre demande de service',
        kind: 'received',
        price: data.proposedPrice,
        days: data.proposedDays,
        serviceUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/service-orders/${order.id}`,
      });
    } catch {
      // Le devis reste valide même si la notification échoue.
    }
    return savedQuote;
  }

  async getQuote(clientOrArtisanId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Demande introuvable');
    if (order.clientId !== clientOrArtisanId && order.artisanId !== clientOrArtisanId) {
      throw new ForbiddenException('Cette demande ne vous concerne pas');
    }
    return this.quotesRepository.findOne({
      where: { orderId },
      relations: { artisan: true },
      order: { createdAt: 'DESC' },
    });
  }

  async respondToQuote(clientId: string, orderId: string, accepted: boolean, response?: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId, clientId }, relations: { artisan: true } });
    if (!order) throw new NotFoundException('Demande client introuvable');
    const quote = await this.quotesRepository.findOne({ where: { orderId, status: 'pending' } });
    if (!quote) throw new NotFoundException('Aucun devis en attente');
    if (quote.expiresAt.getTime() < Date.now()) {
      quote.status = 'rejected';
      quote.clientResponse = 'Devis expiré';
      await this.quotesRepository.save(quote);
      throw new BadRequestException('Le délai de réponse de 5 jours est dépassé');
    }

    quote.status = accepted ? 'accepted' : 'rejected';
    quote.clientResponse = response?.trim() || (accepted ? 'Devis accepté' : 'Devis refusé');
    order.status = accepted ? 'accepted' : 'sent_to_artisan';
    await this.quotesRepository.save(quote);
    await this.ordersRepository.save(order);

    if (accepted) await this.createPaymentSchedule(orderId, Number(quote.proposedPrice));

    try {
      await this.notificationsService.notify({
        recipientId: order.artisanId,
        type: 'order_status',
        title: accepted ? 'Devis accepté' : 'Devis refusé',
        content: quote.clientResponse,
        link: `/service-orders/${order.id}`,
        relatedId: order.id,
      });
      await this.emailService.sendQuoteEmail({
        to: order.artisan.email,
        recipientName: order.artisan.name,
        serviceTitle: 'votre devis',
        kind: accepted ? 'accepted' : 'rejected',
        response: quote.clientResponse ?? undefined,
        serviceUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/service-orders/${order.id}`,
      });
    } catch {
      // La réponse client reste enregistrée même si la notification échoue.
    }
    return quote;
  }

  async artisanRespond(artisanId: string, orderId: string, accepted: boolean, feedback?: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, artisanId },
      relations: { client: true, service: true },
    });
    if (!order) throw new NotFoundException('Demande artisan introuvable');
    if (order.status !== 'sent_to_artisan') {
      throw new BadRequestException('Cette demande n’est plus en attente de réponse');
    }
    if (!accepted && !feedback?.trim()) {
      throw new BadRequestException('La raison du refus est obligatoire');
    }

    if (accepted) {
      const fixedPrice = Number(order.service.price);
      if (!Number.isFinite(fixedPrice) || fixedPrice <= 0) {
        throw new BadRequestException('Cette demande nécessite un devis avant le démarrage');
      }
    }

    order.status = accepted ? 'accepted' : 'rejected';
    order.adminFeedback = accepted ? null : feedback!.trim();
    const savedOrder = await this.ordersRepository.save(order);

    if (accepted) {
      const fixedPrice = Number(order.service.price);
      await this.createPaymentSchedule(orderId, fixedPrice);
    }

    try {
      await this.notificationsService.notify({
        recipientId: order.clientId,
        type: 'order_status',
        title: accepted ? 'Demande acceptée par l’artisan' : 'Demande refusée par l’artisan',
        content: accepted
          ? 'L’artisan a accepté votre demande. Réglez l’acompte de 30 % pour permettre le démarrage.'
          : feedback!.trim(),
        link: `/service-orders/${order.id}`,
        relatedId: order.id,
      });
    } catch {
      // La décision reste enregistrée même si la notification échoue.
    }
    return savedOrder;
  }

  private async createPaymentSchedule(orderId: string, total: number) {
    await this.ordersRepository.update(orderId, {
      platformFee: Math.round(total * PLATFORM_FEE_RATE),
    });
    const existingPayments = await this.paymentsRepository.find({ where: { orderId } });
    if (existingPayments.length) return existingPayments;

    return this.paymentsRepository.save([
      this.paymentsRepository.create({
        orderId,
        type: 'deposit',
        amount: Math.round(total * 0.3),
        status: 'pending',
        method: 'orange_money',
        transactionId: null,
        paidAt: null,
      }),
      this.paymentsRepository.create({
        orderId,
        type: 'balance',
        amount: Math.round(total * 0.7),
        status: 'pending',
        method: 'orange_money',
        transactionId: null,
        paidAt: null,
      }),
    ]);
  }

  async updateArtisanProgress(artisanId: string, orderId: string, status: 'in_progress' | 'delivered', fileUrls?: string[]) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId, artisanId }, relations: { client: true, artisan: true, service: true } });
    if (!order) throw new NotFoundException('Commande artisan introuvable');
    if (status === 'in_progress' && order.status !== 'accepted') {
      throw new BadRequestException('Seule une commande acceptée peut démarrer');
    }
    if (status === 'in_progress') {
      const deposit = await this.paymentsRepository.findOne({ where: { orderId, type: 'deposit' } });
      if (!deposit || deposit.status !== 'paid') {
        throw new BadRequestException('L’acompte doit être payé avant le démarrage');
      }
    }
    if (status === 'delivered' && order.status !== 'in_progress') {
      throw new BadRequestException('Seule une commande en cours peut être livrée');
    }
    if (status === 'delivered' && !fileUrls?.length) {
      throw new BadRequestException('Ajoutez au moins un fichier ou lien de livraison');
    }

    order.status = status;
    if (fileUrls?.length) order.fileUrls = [...new Set([...(order.fileUrls ?? []), ...fileUrls])];
    if (status === 'delivered') order.deliveredAt = new Date();
    const savedOrder = await this.ordersRepository.save(order);
    if (status === 'delivered') {
      const content = `La livraison de « ${order.service.title} » est disponible. Vérifiez les livrables et validez la commande.`;
      try {
        await this.notificationsService.notify({
          recipientId: order.clientId,
          type: 'order_status',
          title: 'Votre commande a été livrée',
          content,
          link: `/service-orders/${order.id}`,
          relatedId: order.id,
        });
        await this.emailService.send({
          to: order.client.email,
          subject: '[ArtisanConnect] Votre commande a été livrée',
          text: `${content}\n\n${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/service-orders/${order.id}`,
          html: `<p>${content}</p><p><a href="${process.env.FRONTEND_URL ?? 'http://localhost:3000'}/service-orders/${order.id}">Consulter la livraison</a></p>`,
        });
      } catch {
        // La livraison reste enregistrée même si la notification échoue.
      }
    }
    return savedOrder;
  }

  async getPayments(clientOrArtisanId: string, orderId: string) {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande introuvable');
    if (order.clientId !== clientOrArtisanId && order.artisanId !== clientOrArtisanId) {
      throw new ForbiddenException('Ces paiements ne vous concernent pas');
    }
    return this.paymentsRepository.find({ where: { orderId }, order: { type: 'ASC' } });
  }

  async confirmTestPayment(clientId: string, orderId: string, type: 'deposit' | 'balance') {
    if (process.env.NODE_ENV === 'production' || process.env.ORANGE_MONEY_MODE !== 'mock') {
      throw new ForbiddenException('La confirmation mock est désactivée');
    }

    const order = await this.ordersRepository.findOne({ where: { id: orderId, clientId } });
    if (!order) throw new NotFoundException('Commande client introuvable');
    if (type === 'deposit' && order.status !== 'accepted') {
      throw new BadRequestException('L’acompte est disponible après acceptation du devis');
    }
    if (type === 'balance' && !['delivered', 'completed'].includes(order.status)) {
      throw new BadRequestException('Le solde est disponible après la livraison');
    }

    const payment = await this.paymentsRepository.findOne({ where: { orderId, type } });
    if (!payment) throw new NotFoundException('Échéance de paiement introuvable');
    if (payment.status === 'paid') return payment;

    payment.status = 'paid';
    payment.method = 'orange_money';
    payment.transactionId = `OM-SERVICE-TEST-${Date.now()}`;
    payment.paidAt = new Date();
    return this.paymentsRepository.save(payment);
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendDeadlineReminders() {
    const now = Date.now();
    const orders = await this.ordersRepository.find({ relations: { client: true, artisan: true, service: true } });
    const since = new Date(now - 24 * 60 * 60 * 1000);
    for (const order of orders) {
      let recipientId: string | null = null;
      let title = '';
      let content = '';
      if (order.status === 'pending_admin_validation' && now - order.createdAt.getTime() > 24 * 60 * 60 * 1000) {
        const admins = await this.usersRepository.find({ where: { role: 'admin', isActive: true } });
        for (const admin of admins) await this.sendReminder(admin.id, admin.email, order.id, 'Demande admin en attente', `La demande « ${order.service?.title} » attend une validation depuis plus de 24 h.`, since, '/admin/service-orders');
        continue;
      }
      if (order.status === 'sent_to_artisan' && now - order.updatedAt.getTime() > 48 * 60 * 60 * 1000) {
        recipientId = order.artisanId; title = 'Réponse artisan attendue'; content = `La demande « ${order.service?.title} » attend votre réponse.`;
      } else if (order.status === 'quote_pending') {
        const quote = await this.quotesRepository.findOne({ where: { orderId: order.id, status: 'pending' } });
        if (quote && quote.expiresAt.getTime() - now < 24 * 60 * 60 * 1000) { recipientId = order.clientId; title = 'Votre devis expire bientôt'; content = `Votre devis pour « ${order.service?.title} » expire bientôt.`; }
      } else if (order.status === 'delivered' && order.deliveredAt && now - order.deliveredAt.getTime() > 24 * 60 * 60 * 1000) {
        recipientId = order.clientId; title = 'Livraison à valider'; content = `La livraison de « ${order.service?.title} » attend votre validation.`;
      }
      if (recipientId) await this.sendReminder(recipientId, recipientId === order.clientId ? order.client.email : order.artisan.email, order.id, title, content, since, `/service-orders/${order.id}`);
    }
  }

  private async sendReminder(recipientId: string, email: string, orderId: string, title: string, content: string, since: Date, link: string) {
    if (await this.notificationsService.hasRecent(recipientId, orderId, title, since)) return;
    await this.notificationsService.notify({ recipientId, type: 'order_status', title, content, link, relatedId: orderId });
    await this.emailService.send({ to: email, subject: `[ArtisanConnect] ${title}`, text: `${content}\n\n${process.env.FRONTEND_URL ?? 'http://localhost:3000'}${link}` });
  }

  async respondToDelivery(clientId: string, orderId: string, accepted: boolean, feedback?: string) {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId, clientId },
      relations: { artisan: true, service: true },
    });
    if (!order) throw new NotFoundException('Commande client introuvable');
    if (order.status !== 'delivered') {
      throw new BadRequestException('Cette commande n’est pas en attente de validation');
    }
    if (!accepted && !feedback?.trim()) {
      throw new BadRequestException('Décrivez la correction demandée');
    }

    order.status = accepted ? 'completed' : 'in_progress';
    order.deliveryFeedback = accepted ? null : feedback!.trim();
    if (accepted) order.completedAt = new Date();
    const savedOrder = await this.ordersRepository.save(order);

    try {
      await this.notificationsService.notify({
        recipientId: order.artisanId,
        type: 'order_status',
        title: accepted ? 'Livraison acceptée' : 'Correction demandée',
        content: accepted ? 'Le client a accepté la livraison.' : feedback!.trim(),
        link: `/service-orders/${order.id}`,
        relatedId: order.id,
      });
    } catch {
      // Le retour client reste enregistré même si la notification échoue.
    }
    return savedOrder;
  }
}

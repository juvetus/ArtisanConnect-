import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { InstitutionalProgram, InstitutionalResource, Listing, Order, Payment, ProgramApplication, ServiceOrder, Shop, User } from '../../entities/index.js';
import { ShopsService } from '../shops/shops.service.js';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Listing) private listings: Repository<Listing>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
    @InjectRepository(Shop) private shops: Repository<Shop>,
    @InjectRepository(ServiceOrder) private serviceOrders: Repository<ServiceOrder>,
    @InjectRepository(InstitutionalResource) private resources: Repository<InstitutionalResource>,
    @InjectRepository(InstitutionalProgram) private programs: Repository<InstitutionalProgram>,
    @InjectRepository(ProgramApplication) private applications: Repository<ProgramApplication>,
    private dataSource: DataSource,
    private shopsService: ShopsService,
    private config: ConfigService,
  ) {}

  async onModuleInit() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password || (await this.users.findOne({ where: { email } }))) return;

    await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name: this.config.get('ADMIN_NAME', 'Administrateur'),
        role: 'admin',
      }),
    );
  }

  async overview() {
    const [
      users,
      artisans,
      clients,
      institutions,
      listings,
      orders,
      completedOrders,
      pendingPayments,
      recentOrders,
      completedServiceOrders,
      resources,
      programs,
      programApplications,
      pilotShops,
    ] = await Promise.all([
      this.users.count(),
      this.users.count({ where: { role: 'artisan' } }),
      this.users.count({ where: { role: 'client' } }),
      this.users.count({ where: { role: 'institution' } }),
      this.listings.count({ where: { status: 'active' } }),
      this.orders.count(),
      this.orders.find({ where: { status: 'completed' }, select: { totalPrice: true, platformFee: true } }),
      this.payments.count({ where: { status: 'pending' } }),
      this.orders.find({
        relations: { buyer: true, seller: true, listing: true, payment: true },
        order: { createdAt: 'DESC' },
        take: 8,
      }),
      this.serviceOrders.find({ where: { status: 'completed' }, select: { platformFee: true } }),
      this.resources.count({ where: { published: true } }),
      this.programs.count({ where: { status: 'active' } }),
      this.applications.count(),
      this.shops.find({
        where: { status: 'active' },
        select: {
          views: true,
          whatsappContactClicks: true,
          whatsappShareClicks: true,
          successfulSales: true,
        },
      }),
    ]);

    // Décompte spécifique pour l'impact de genre & coopératives
    const womenArtisanRows = await this.users
      .createQueryBuilder('u')
      .leftJoin('u.shops', 's')
      .where("u.role = 'artisan'")
      .andWhere("(u.gender = 'female' OR s.isWomenLed = true)")
      .select('DISTINCT u.id', 'id')
      .getRawMany();

    const cooperativeRows = await this.users
      .createQueryBuilder('u')
      .leftJoin('u.shops', 's')
      .where("u.role = 'artisan'")
      .andWhere("(u.gender = 'cooperative' OR s.isCooperative = true)")
      .select('DISTINCT u.id', 'id')
      .getRawMany();

    const womenArtisans = womenArtisanRows.length;
    const cooperativeArtisans = cooperativeRows.length;
    const womenPercentage = artisans > 0 ? Math.round((womenArtisans / artisans) * 100) : 0;
    const cooperativePercentage = artisans > 0 ? Math.round((cooperativeArtisans / artisans) * 100) : 0;

    const revenue = completedOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
    const platformFees = completedOrders.reduce((sum, order) => sum + Number(order.platformFee), 0);
    const servicePlatformFees = completedServiceOrders.reduce((sum, order) => sum + Number(order.platformFee), 0);
    const shopMetrics = pilotShops.reduce(
      (totals, shop) => ({
        views: totals.views + Number(shop.views ?? 0),
        whatsappContacts: totals.whatsappContacts + Number(shop.whatsappContactClicks ?? 0),
        shares: totals.shares + Number(shop.whatsappShareClicks ?? 0),
        successfulSales: totals.successfulSales + Number(shop.successfulSales ?? 0),
      }),
      { views: 0, whatsappContacts: 0, shares: 0, successfulSales: 0 },
    );

    return {
      stats: {
        users,
        artisans,
        clients,
        institutions,
        listings,
        orders,
        revenue,
        platformFees: platformFees + servicePlatformFees,
        servicePlatformFees,
        pendingPayments,
        womenArtisans,
        womenPercentage,
        cooperativeArtisans,
        cooperativePercentage,
        resources,
        programs,
        programApplications,
        activeShops: pilotShops.length,
        shopViews: shopMetrics.views,
        whatsappContacts: shopMetrics.whatsappContacts,
        shopShares: shopMetrics.shares,
        successfulSales: shopMetrics.successfulSales,
      },
      recentOrders,
    };
  }

  async listUsers() {
    return this.users.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'editor' | 'viewer' | 'artisan' | 'client' | 'institution';
    gender?: 'female' | 'male' | 'cooperative' | 'other';
  }) {
    const name = data.name?.trim();
    const email = data.email?.toLowerCase().trim();
    const password = data.password || '';
    const allowedRoles = ['admin', 'editor', 'viewer', 'artisan', 'client', 'institution'] as const;

    if (!name || !email || !password) {
      throw new BadRequestException('Nom, e-mail et mot de passe sont obligatoires');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Adresse e-mail invalide');
    }
    if (password.length < 8) {
      throw new BadRequestException('Le mot de passe doit contenir au moins 8 caractères');
    }
    if (!allowedRoles.includes(data.role)) {
      throw new BadRequestException('Rôle invalide');
    }
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new BadRequestException('Cet e-mail est déjà associé à un compte');
    }

    const user = await this.users.save(
      this.users.create({
        email,
        passwordHash: await bcrypt.hash(password, 10),
        name,
        role: data.role,
        gender: data.role === 'artisan' ? data.gender ?? null : null,
        verifiedEmail: true,
        isActive: true,
      }),
    );

    const { passwordHash: _passwordHash, ...safeUser } = user as User & { passwordHash?: string };
    return safeUser;
  }

  async listListings() {
    return this.listings.find({
      relations: { seller: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async listOrders() {
    return this.orders.find({
      relations: { buyer: true, seller: true, listing: true, payment: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async cancelOrder(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (order.status === 'completed') throw new BadRequestException('Une commande terminée ne peut pas être annulée');
      if (order.status !== 'cancelled') {
        await manager.increment(Listing, { id: order.listingId }, 'stock', order.quantity);
        await manager.update(Order, id, { status: 'cancelled' });
      }
      return this.orders.findOne({ where: { id }, relations: { buyer: true, seller: true, listing: true, payment: true } });
    });
  }

  async refundOrder(id: string) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id }, relations: { payment: true } });
      if (!order) throw new NotFoundException('Commande introuvable');
      if (!order.payment) throw new BadRequestException('Aucun paiement associé à cette commande');
      if (!['confirmed', 'captured'].includes(order.payment.status)) {
        throw new BadRequestException('Seuls les paiements confirmés peuvent être remboursés');
      }
      order.payment.status = 'refunded';
      await manager.save(Payment, order.payment);
      if (order.status !== 'cancelled' && order.status !== 'completed') {
        await manager.increment(Listing, { id: order.listingId }, 'stock', order.quantity);
        await manager.update(Order, id, { status: 'cancelled' });
      }
      return this.orders.findOne({ where: { id }, relations: { buyer: true, seller: true, listing: true, payment: true } });
    });
  }

  async setListingStatus(id: string, status: 'active' | 'inactive') {
    await this.listings.update(id, { status });
    return this.listings.findOne({ where: { id }, relations: { seller: true } });
  }

  async setUserRole(id: string, role: 'admin' | 'editor' | 'viewer' | 'artisan' | 'client' | 'institution') {
    await this.users.update(id, { role });
    return this.users.findOne({ where: { id } });
  }

  async setUserActive(id: string, isActive: boolean) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    if (user.role === 'admin') throw new BadRequestException('Un compte administrateur ne peut pas être désactivé');
    await this.users.update(id, { isActive });
    return this.users.findOne({ where: { id } });
  }

  async deleteUser(id: string, currentAdminId: string) {
    if (id === currentAdminId) throw new BadRequestException('Vous ne pouvez pas supprimer votre propre compte');
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    const [ordersAsBuyer, ordersAsSeller] = await Promise.all([
      this.orders.count({ where: { buyerId: id } }),
      this.orders.count({ where: { sellerId: id } }),
    ]);
    if (ordersAsBuyer || ordersAsSeller) {
      throw new BadRequestException('Cet utilisateur possède des commandes ; désactivez son compte à la place');
    }
    await this.users.delete(id);
    return { message: 'Utilisateur supprimé' };
  }

  async setShopStatus(id: string, status: 'active' | 'suspended') {
    const shop = await this.shops.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    await this.shops.update(id, { status });
    return this.shops.findOne({ where: { id }, relations: { seller: true } });
  }

  async deleteShop(id: string) {
    const shop = await this.shops.findOne({ where: { id } });
    if (!shop) throw new NotFoundException('Boutique introuvable');
    await this.shops.delete(id);
    return { message: 'Boutique supprimée' };
  }

  async deleteListing(id: string) {
    const listing = await this.listings.findOne({ where: { id } });
    if (!listing) throw new NotFoundException('Annonce introuvable');
    const orderCount = await this.orders.count({ where: { listingId: id } });
    if (orderCount) throw new BadRequestException('Cette annonce possède des commandes ; désactivez-la à la place');
    await this.listings.delete(id);
    return { message: 'Annonce supprimée' };
  }

  async listShops(status?: 'pending' | 'active' | 'rejected' | 'suspended') {
    return this.shops.find({
      where: status ? { status } : {},
      relations: { seller: true },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  /** Validation manuelle des boutiques Artisan (Étape 4 du workflow). */
  async reviewShop(id: string, approve: boolean, reason?: string) {
    return this.shopsService.review(id, approve, reason);
  }

  /** À n'activer qu'après contrôle effectif de la pièce d'identité KYC. */
  async setShopIdentityVerified(id: string, verified: boolean) {
    return this.shopsService.setIdentityVerified(id, verified);
  }
}

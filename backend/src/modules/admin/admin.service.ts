import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async setListingStatus(id: string, status: 'active' | 'inactive') {
    await this.listings.update(id, { status });
    return this.listings.findOne({ where: { id }, relations: { seller: true } });
  }

  async setUserRole(id: string, role: 'artisan' | 'client') {
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
}

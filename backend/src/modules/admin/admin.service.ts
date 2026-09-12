import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import bcrypt from 'bcrypt';
import { Listing, Order, Payment, User } from '../../entities/index.js';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(Listing) private listings: Repository<Listing>,
    @InjectRepository(Order) private orders: Repository<Order>,
    @InjectRepository(Payment) private payments: Repository<Payment>,
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
    const [users, artisans, clients, listings, orders, completedOrders, pendingPayments, recentOrders] =
      await Promise.all([
        this.users.count(),
        this.users.count({ where: { role: 'artisan' } }),
        this.users.count({ where: { role: 'client' } }),
        this.listings.count({ where: { status: 'active' } }),
        this.orders.count(),
        this.orders.find({ where: { status: 'completed' }, select: { totalPrice: true, platformFee: true } }),
        this.payments.count({ where: { status: 'pending' } }),
        this.orders.find({
          relations: { buyer: true, seller: true, listing: true, payment: true },
          order: { createdAt: 'DESC' },
          take: 8,
        }),
      ]);

    const revenue = completedOrders.reduce((sum, order) => sum + Number(order.totalPrice), 0);
    const platformFees = completedOrders.reduce((sum, order) => sum + Number(order.platformFee), 0);

    return {
      stats: { users, artisans, clients, listings, orders, revenue, platformFees, pendingPayments },
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
}

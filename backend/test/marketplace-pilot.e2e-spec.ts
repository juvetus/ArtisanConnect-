import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Listing, Notification, Order, Payment, Review, Service, ServiceOrder, ServicePayment, ServiceQuote, ServiceReview, Shop, User } from '../src/entities/index.js';

describe('Pilote marketplace - parcours commande produit', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  const createdIds = {
    users: [] as string[],
    shops: [] as string[],
    listings: [] as string[],
    orders: [] as string[],
    payments: [] as string[],
    reviews: [] as string[],
    services: [] as string[],
    serviceOrders: [] as string[],
    servicePayments: [] as string[],
    serviceQuotes: [] as string[],
    serviceReviews: [] as string[],
  };

  beforeAll(async () => {
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.DB_RETRY_ATTEMPTS = '1';
    process.env.DB_RETRY_DELAY = '100';
    process.env.DEMO_MODE = 'false';
    process.env.JWT_SECRET = 'marketplace-pilot-e2e-secret';
    process.env.MOMO_MODE = 'mock';
    process.env.ORANGE_MONEY_MODE = 'mock';
    process.env.SMTP_ENABLED = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    if (!dataSource?.isInitialized) return;

    if (createdIds.serviceOrders.length) await dataSource.getRepository(Notification).delete({ relatedId: In(createdIds.serviceOrders) });
    if (createdIds.serviceReviews.length) await dataSource.getRepository(ServiceReview).delete({ id: In(createdIds.serviceReviews) });
    if (createdIds.servicePayments.length) await dataSource.getRepository(ServicePayment).delete({ id: In(createdIds.servicePayments) });
    if (createdIds.serviceQuotes.length) await dataSource.getRepository(ServiceQuote).delete({ id: In(createdIds.serviceQuotes) });
    if (createdIds.serviceOrders.length) await dataSource.getRepository(ServiceOrder).delete({ id: In(createdIds.serviceOrders) });
    if (createdIds.services.length) await dataSource.getRepository(Service).delete({ id: In(createdIds.services) });
    if (createdIds.reviews.length) await dataSource.getRepository(Review).delete({ id: In(createdIds.reviews) });
    if (createdIds.payments.length) await dataSource.getRepository(Payment).delete({ id: In(createdIds.payments) });
    if (createdIds.orders.length) await dataSource.getRepository(Order).delete({ id: In(createdIds.orders) });
    if (createdIds.listings.length) await dataSource.getRepository(Listing).delete({ id: In(createdIds.listings) });
    if (createdIds.shops.length) await dataSource.getRepository(Shop).delete({ id: In(createdIds.shops) });
    if (createdIds.users.length) await dataSource.getRepository(User).delete({ id: In(createdIds.users) });

    createdIds.users = [];
    createdIds.shops = [];
    createdIds.listings = [];
    createdIds.orders = [];
    createdIds.payments = [];
    createdIds.reviews = [];
    createdIds.services = [];
    createdIds.serviceOrders = [];
    createdIds.servicePayments = [];
    createdIds.serviceQuotes = [];
    createdIds.serviceReviews = [];
  });

  it('permet recherche, commande cash, confirmation vendeur et avis vérifié', async () => {
    const buyer = await createUser('client');
    const seller = await createUser('artisan');
    const shop = await dataSource.getRepository(Shop).save(dataSource.getRepository(Shop).create({
      sellerId: seller.id,
      type: 'artisan',
      name: 'Atelier E2E',
      description: 'Boutique créée pour le test isolé du parcours pilote.',
      category: 'vannerie',
      city: 'Douala',
      neighborhood: 'Akwa',
      mobileMoneyNumber: '+237699000001',
      momoNumber: '+237699000001',
      mobileMoneyProvider: 'momo',
      deliveryMode: 'workshop',
      deliveryMethods: ['workshop'],
      kycDocuments: [],
      status: 'active',
    }));
    createdIds.shops.push(shop.id);

    const listing = await dataSource.getRepository(Listing).save(dataSource.getRepository(Listing).create({
      sellerId: seller.id,
      shopId: shop.id,
      title: 'Panier E2E en vannerie',
      description: 'Panier tressé à la main pour valider le parcours de commande de bout en bout.',
      category: 'vannerie',
      type: 'product',
      price: 12000,
      status: 'active',
      stock: 2,
      acceptedPaymentMethods: ['cash'],
      deliveryMethods: ['workshop'],
      isDemo: false,
    }));
    createdIds.listings.push(listing.id);

    const buyerToken = signToken(buyer);
    const sellerToken = signToken(seller);

    const search = await request(app.getHttpServer())
      .get('/listings')
      .query({ q: 'Panier E2E' })
      .expect(200);
    expect(search.body[0].map((item: Listing) => item.id)).toContain(listing.id);

    const createOrder = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ listingId: listing.id, quantity: 1, paymentMethod: 'cash', deliveryMethod: 'workshop' })
      .expect(201);
    const order = createOrder.body as Order;
    createdIds.orders.push(order.id);

    expect(Number(order.totalPrice)).toBe(12000);
    expect(order.status).toBe('pending');
    expect(Number((await dataSource.getRepository(Listing).findOneByOrFail({ id: listing.id })).stock)).toBe(1);

    const payment = await dataSource.getRepository(Payment).findOneByOrFail({ orderId: order.id });
    createdIds.payments.push(payment.id);
    expect(payment.method).toBe('cash');
    expect(payment.status).toBe('pending');

    await request(app.getHttpServer())
      .post(`/payments/order/${order.id}/confirm-cash`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .expect(201);

    const completedOrder = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });
    expect(completedOrder.status).toBe('completed');
    expect((await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id })).status).toBe('confirmed');

    const reviewResponse = await request(app.getHttpServer())
      .post('/reviews')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({ orderId: order.id, rating: 5, comment: 'Commande reçue et conforme.' })
      .expect(201);
    createdIds.reviews.push(reviewResponse.body.id);
    expect(reviewResponse.body.verified).toBe(true);
    expect(reviewResponse.body.recipientId).toBe(seller.id);
  });

  it('permet une demande de service, un devis, une livraison et un avis après paiements de test', async () => {
    const client = await createUser('client');
    const artisan = await createUser('artisan');
    const admin = await createUser('admin');
    const service = await dataSource.getRepository(Service).save(dataSource.getRepository(Service).create({
      title: 'Couture sur mesure E2E',
      description: 'Prestation de couture créée pour tester le parcours pilote.',
      price: 0,
      priceMin: 20000,
      priceMax: 30000,
      estimatedDays: 7,
      category: 'couture',
      status: 'approved',
      isDemo: false,
      artisan: { id: artisan.id } as User,
    }));
    createdIds.services.push(service.id);

    const clientToken = signToken(client);
    const artisanToken = signToken(artisan);
    const adminToken = signToken(admin);

    const requestResponse = await request(app.getHttpServer())
      .post('/service-orders')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        serviceId: service.id,
        projectObjective: 'Je souhaite faire confectionner une tenue sur mesure pour une cérémonie familiale.',
        budgetMin: 20000,
        budgetMax: 30000,
        deliveryMethod: 'workshop',
        clientConfirmed: true,
        termsAccepted: true,
      })
      .expect(201);
    const serviceOrderId = requestResponse.body.id as string;
    createdIds.serviceOrders.push(serviceOrderId);
    expect(requestResponse.body.status).toBe('pending_admin_validation');

    await request(app.getHttpServer())
      .post(`/service-orders/admin/${serviceOrderId}/validate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(201);

    const quoteResponse = await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/quote`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ proposedPrice: 25000, proposedDays: 7, details: 'Confection complète, prise de mesures et deux essayages inclus.' })
      .expect(201);
    createdIds.serviceQuotes.push(quoteResponse.body.id);
    expect(quoteResponse.body.status).toBe('pending');

    await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/quote/respond`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ accepted: true, response: 'Devis accepté pour le test.' })
      .expect(201);
    expect((await dataSource.getRepository(ServiceOrder).findOneByOrFail({ id: serviceOrderId })).status).toBe('accepted');

    const deposit = await dataSource.getRepository(ServicePayment).findOneByOrFail({ orderId: serviceOrderId, type: 'deposit' });
    const balance = await dataSource.getRepository(ServicePayment).findOneByOrFail({ orderId: serviceOrderId, type: 'balance' });
    createdIds.servicePayments.push(deposit.id, balance.id);
    expect(Number(deposit.amount)).toBe(7500);
    expect(Number(balance.amount)).toBe(17500);

    await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/payments/deposit/confirm-test`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/artisan/start`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({})
      .expect(201);
    await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/artisan/deliver`)
      .set('Authorization', `Bearer ${artisanToken}`)
      .send({ fileUrls: ['https://example.test/e2e-livrable.pdf'] })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/client/delivery-response`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ accepted: true })
      .expect(201);

    const completedOrder = await dataSource.getRepository(ServiceOrder).findOneByOrFail({ id: serviceOrderId });
    expect(completedOrder.status).toBe('completed');

    await request(app.getHttpServer())
      .post(`/service-orders/${serviceOrderId}/payments/balance/confirm-test`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({})
      .expect(201);

    const reviewResponse = await request(app.getHttpServer())
      .post('/service-reviews')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ orderId: serviceOrderId, rating: 5, comment: 'Prestation terminée et conforme.' })
      .expect(201);
    createdIds.serviceReviews.push(reviewResponse.body.id);
    expect(reviewResponse.body.verified).toBe(true);
    expect((await dataSource.getRepository(ServicePayment).findBy({ orderId: serviceOrderId })).every((payment) => payment.status === 'paid')).toBe(true);
  });

  function createUser(role: 'client' | 'artisan' | 'admin') {
    return dataSource.getRepository(User).save(dataSource.getRepository(User).create({
      email: `${role}-${crypto.randomUUID()}@example.test`,
      passwordHash: 'e2e-hashed-password',
      role,
      name: `Utilisateur ${role} E2E`,
      phone: '+237699000001',
      isActive: true,
    })).then((user) => {
      createdIds.users.push(user.id);
      return user;
    });
  }

  function signToken(user: User): string {
    return jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }
});

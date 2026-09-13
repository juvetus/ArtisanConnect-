import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Listing, Order, Payment, Subscription, SubscriptionPlan, User } from '../src/entities/index.js';

describe('MoMo webhooks (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const webhookSecret = 'e2e-momo-webhook-secret';
  const createdIds = {
    users: [] as string[],
    listings: [] as string[],
    orders: [] as string[],
    payments: [] as string[],
    subscriptions: [] as string[],
    plans: [] as string[],
  };

  beforeAll(async () => {
    process.env.MOMO_WEBHOOK_SECRET = webhookSecret;
    process.env.MOMO_MODE = 'mock';
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.DB_RETRY_ATTEMPTS = '1';
    process.env.DB_RETRY_DELAY = '100';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();
    dataSource = app.get(DataSource);
  }, 30_000);

  afterAll(async () => {
    await app?.close();
  });

  afterEach(async () => {
    if (!dataSource?.isInitialized) return;

    if (createdIds.payments.length) await dataSource.getRepository(Payment).delete({ id: In(createdIds.payments) });
    if (createdIds.orders.length) await dataSource.getRepository(Order).delete({ id: In(createdIds.orders) });
    if (createdIds.listings.length) await dataSource.getRepository(Listing).delete({ id: In(createdIds.listings) });
    if (createdIds.subscriptions.length) await dataSource.getRepository(Subscription).delete({ id: In(createdIds.subscriptions) });
    if (createdIds.plans.length) await dataSource.getRepository(SubscriptionPlan).delete({ id: In(createdIds.plans) });
    if (createdIds.users.length) await dataSource.getRepository(User).delete({ id: In(createdIds.users) });

    createdIds.users = [];
    createdIds.listings = [];
    createdIds.orders = [];
    createdIds.payments = [];
    createdIds.subscriptions = [];
    createdIds.plans = [];
  });

  it('updates an order payment when /payments/momo/webhook receives a valid HMAC signature', async () => {
    const buyer = await createUser('buyer');
    const seller = await createUser('seller');
    const listing = await dataSource.getRepository(Listing).save(
      dataSource.getRepository(Listing).create({
        title: 'Panier test MoMo',
        description: 'Produit de test',
        category: 'vannerie',
        type: 'product',
        price: 1000,
        status: 'active',
        stock: 1,
        sellerId: seller.id,
      }),
    );
    createdIds.listings.push(listing.id);
    const order = await dataSource.getRepository(Order).save(
      dataSource.getRepository(Order).create({
        buyerId: buyer.id,
        sellerId: seller.id,
        listingId: listing.id,
        quantity: 1,
        totalPrice: 1000,
        platformFee: 50,
        status: 'pending',
        paymentMethod: 'momo',
      }),
    );
    createdIds.orders.push(order.id);
    const payment = await dataSource.getRepository(Payment).save(
      dataSource.getRepository(Payment).create({
        orderId: order.id,
        amount: 1000,
        method: 'momo',
        status: 'pending',
        orangeMoneyTransactionId: `ORDER-${order.id}`,
      }),
    );
    createdIds.payments.push(payment.id);

    await postSigned('/payments/momo/webhook', {
      externalId: `ORDER-${order.id}`,
      referenceId: `ORDER-${order.id}`,
      transactionId: 'momo-order-tx-1',
      amount: '1000',
      currency: 'XAF',
      status: 'SUCCESSFUL',
    }).expect(201);

    const updatedPayment = await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id });
    const updatedOrder = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });

    expect(updatedPayment.status).toBe('confirmed');
    expect(updatedPayment.orangeMoneyTransactionId).toBe('momo-order-tx-1');
    expect(updatedOrder.status).toBe('confirmed');
  });

  it('activates a subscription when /subscriptions/webhook receives a valid HMAC signature', async () => {
    const user = await createUser('subscriber');
    const plan = await dataSource.getRepository(SubscriptionPlan).save(
      dataSource.getRepository(SubscriptionPlan).create({
        name: 'Premium e2e',
        price: 5000,
        currency: 'XAF',
        durationDays: 30,
        isActive: true,
      }),
    );
    createdIds.plans.push(plan.id);
    const subscription = await dataSource.getRepository(Subscription).save(
      dataSource.getRepository(Subscription).create({
        userId: user.id,
        planId: plan.id,
        status: 'pending',
        amount: 5000,
        currency: 'XAF',
        startDate: new Date(),
        endDate: new Date(),
        nextPaymentAt: new Date(),
        paymentReference: `SUB-${randomUUID()}`,
        provider: 'momo',
      }),
    );
    createdIds.subscriptions.push(subscription.id);
    subscription.paymentReference = `SUB-${subscription.id}`;
    await dataSource.getRepository(Subscription).save(subscription);

    await postSigned('/subscriptions/webhook', {
      externalId: `SUB-${subscription.id}`,
      referenceId: `SUB-${subscription.id}`,
      transactionId: 'momo-sub-tx-1',
      amount: '5000',
      currency: 'XAF',
      status: 'SUCCESSFUL',
    }).expect(201);

    const updatedSubscription = await dataSource.getRepository(Subscription).findOneByOrFail({ id: subscription.id });

    expect(updatedSubscription.status).toBe('active');
    expect(updatedSubscription.lastPaymentAt).toBeInstanceOf(Date);
    expect(updatedSubscription.nextPaymentAt).toBeInstanceOf(Date);
  });

  it('rejects an unsigned webhook', async () => {
    await request(app.getHttpServer())
      .post('/subscriptions/webhook')
      .send({ externalId: 'SUB-missing', status: 'SUCCESSFUL' })
      .expect(401);
  });

  async function createUser(prefix: string): Promise<User> {
    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `${prefix}-${randomUUID()}@example.test`,
        passwordHash: 'hashed-password',
        role: prefix === 'seller' ? 'artisan' : 'client',
        name: prefix,
        phone: '237699000000',
      }),
    );
    createdIds.users.push(user.id);
    return user;
  }

  function postSigned(path: string, payload: Record<string, unknown>) {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', webhookSecret).update(Buffer.from(body)).digest('hex');

    return request(app.getHttpServer())
      .post(path)
      .set('Content-Type', 'application/json')
      .set('x-momo-signature', `sha256=${signature}`)
      .send(body);
  }
});

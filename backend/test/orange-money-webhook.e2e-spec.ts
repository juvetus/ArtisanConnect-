import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Listing, Order, Payment, User } from '../src/entities/index.js';
import { randomUUID } from 'node:crypto';

describe('Orange Money callback (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const createdIds = {
    users: [] as string[],
    listings: [] as string[],
    orders: [] as string[],
    payments: [] as string[],
  };

  beforeAll(async () => {
    process.env.ORANGE_MONEY_MODE = 'mock';
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
    if (createdIds.users.length) await dataSource.getRepository(User).delete({ id: In(createdIds.users) });

    createdIds.users = [];
    createdIds.listings = [];
    createdIds.orders = [];
    createdIds.payments = [];
  });

  it('confirms a payment when the callback notif_token matches the stored token', async () => {
    const { order, payment } = await createPendingOrangePayment('orange-notif-token-ok');

    await request(app.getHttpServer())
      .post('/payments/orange/callback')
      .send({
        order_id: order.id,
        txnid: 'orange-tx-1',
        status: 'SUCCESS',
        notif_token: 'orange-notif-token-ok',
      })
      .expect(201);

    const updatedPayment = await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id });
    const updatedOrder = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });

    expect(updatedPayment.status).toBe('confirmed');
    expect(updatedPayment.orangeMoneyTransactionId).toBe('orange-tx-1');
    expect(updatedOrder.status).toBe('confirmed');
  });

  it('rejects a callback when the notif_token does not match', async () => {
    const { order, payment } = await createPendingOrangePayment('orange-notif-token-ok');

    await request(app.getHttpServer())
      .post('/payments/orange/callback')
      .send({
        order_id: order.id,
        txnid: 'orange-tx-1',
        status: 'SUCCESS',
        notif_token: 'wrong-token',
      })
      .expect(400);

    const updatedPayment = await dataSource.getRepository(Payment).findOneByOrFail({ id: payment.id });
    const updatedOrder = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });

    expect(updatedPayment.status).toBe('pending');
    expect(updatedOrder.status).toBe('pending');
  });

  async function createPendingOrangePayment(notifToken: string) {
    const buyer = await createUser('buyer');
    const seller = await createUser('seller');
    const listing = await dataSource.getRepository(Listing).save(
      dataSource.getRepository(Listing).create({
        title: 'Panier test Orange',
        description: 'Produit de test Orange',
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
        paymentMethod: 'orange_money',
      }),
    );
    createdIds.orders.push(order.id);

    const payment = await dataSource.getRepository(Payment).save(
      dataSource.getRepository(Payment).create({
        orderId: order.id,
        amount: 1000,
        method: 'orange_money',
        status: 'pending',
        orangeMoneyTransactionId: 'orange-tx-pending',
        orangeMoneyPaymentToken: 'orange-pay-token',
        orangeMoneyNotifToken: notifToken,
        orangeMoneyPaymentUrl: 'https://orange.example/pay',
      }),
    );
    createdIds.payments.push(payment.id);

    return { order, payment };
  }

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
});

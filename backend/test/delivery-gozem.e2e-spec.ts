import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { createHmac, randomUUID } from 'node:crypto';
import request from 'supertest';
import { DataSource, In } from 'typeorm';
import { AppModule } from '../src/app.module.js';
import { Listing, Order, Payment, User } from '../src/entities/index.js';

describe('Gozem delivery flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtService: JwtService;

  const webhookSecret = 'e2e-gozem-webhook-secret';
  const createdIds = {
    users: [] as string[],
    listings: [] as string[],
    orders: [] as string[],
    payments: [] as string[],
  };

  beforeAll(async () => {
    process.env.CARRIER_PROVIDER = 'Gozem';
    delete process.env.CARRIER_API_KEY;
    process.env.CARRIER_WEBHOOK_SECRET = webhookSecret;
    process.env.DB_SYNCHRONIZE = 'true';
    process.env.DB_RETRY_ATTEMPTS = '1';
    process.env.DB_RETRY_DELAY = '100';
    process.env.JWT_SECRET = 'delivery-e2e-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();
    dataSource = app.get(DataSource);
    jwtService = app.get(JwtService);
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

  it('creates a carrier ride for an order and stores tracking data', async () => {
    const { buyer, order } = await createCarrierOrder();
    const token = signToken(buyer);

    const response = await request(app.getHttpServer())
      .post(`/delivery/orders/${order.id}/ride`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        pickup: {
          location: { address: 'Atelier Akwa, Douala' },
        },
        dropoff: {
          location: { address: 'Bonapriso, Douala' },
        },
      })
      .expect(201);

    const updatedOrder = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });

    expect(response.body.trackingId).toMatch(/^DEL-/);
    expect(updatedOrder.deliveryCarrier).toBe('Gozem');
    expect(updatedOrder.deliveryTrackingId).toBe(response.body.trackingId);
    expect(updatedOrder.deliveryStatus).toBe('assigned');
    expect(updatedOrder.deliveryTrackingUrl).toContain(response.body.trackingId);
  });

  it('updates order tracking when /delivery/webhook receives a valid HMAC signature', async () => {
    const { order } = await createCarrierOrder({ trackingId: 'GOZEM-TRACK-1' });

    await postSigned('/delivery/webhook', {
      tracking_id: 'GOZEM-TRACK-1',
      status: 'delivered',
    }).expect(201);

    const updatedOrder = await dataSource.getRepository(Order).findOneByOrFail({ id: order.id });

    expect(updatedOrder.deliveryStatus).toBe('delivered');
    expect(updatedOrder.carrierPickedUp).toBe(true);
    expect(updatedOrder.carrierVerified).toBe(true);
  });

  it('rejects an unsigned carrier webhook', async () => {
    await request(app.getHttpServer())
      .post('/delivery/webhook')
      .send({ tracking_id: 'GOZEM-TRACK-1', status: 'delivered' })
      .expect(401);
  });

  async function createCarrierOrder(options: { trackingId?: string } = {}) {
    const buyer = await createUser('buyer');
    const seller = await createUser('seller');
    const listing = await dataSource.getRepository(Listing).save(
      dataSource.getRepository(Listing).create({
        title: 'Commande livraison Gozem',
        description: 'Produit à livrer',
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
        status: 'confirmed',
        paymentMethod: 'cash',
        deliveryMethod: 'carrier',
        deliveryAddress: 'Bonapriso, Douala',
        deliveryStatus: options.trackingId ? 'assigned' : 'pending',
        deliveryCarrier: options.trackingId ? 'Gozem' : null,
        deliveryTrackingId: options.trackingId || null,
      }),
    );
    createdIds.orders.push(order.id);

    const payment = await dataSource.getRepository(Payment).save(
      dataSource.getRepository(Payment).create({
        orderId: order.id,
        amount: 1000,
        method: 'cash',
        status: 'confirmed',
      }),
    );
    createdIds.payments.push(payment.id);

    return { buyer, seller, listing, order, payment };
  }

  async function createUser(prefix: string): Promise<User> {
    const user = await dataSource.getRepository(User).save(
      dataSource.getRepository(User).create({
        email: `${prefix}-${randomUUID()}@example.test`,
        passwordHash: 'hashed-password',
        role: prefix === 'seller' ? 'artisan' : 'client',
        name: prefix,
        phone: '237699000000',
        location: prefix === 'seller' ? 'Akwa, Douala' : 'Bonapriso, Douala',
      }),
    );
    createdIds.users.push(user.id);
    return user;
  }

  function signToken(user: User): string {
    return jwtService.sign({ sub: user.id, email: user.email, role: user.role });
  }

  function postSigned(path: string, payload: Record<string, unknown>) {
    const body = JSON.stringify(payload);
    const signature = createHmac('sha256', webhookSecret).update(Buffer.from(body)).digest('hex');

    return request(app.getHttpServer())
      .post(path)
      .set('Content-Type', 'application/json')
      .set('x-gozem-signature', `sha256=${signature}`)
      .send(body);
  }
});

import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryOrderRepository } from '../src/repositories/memory-order-repository.js';

function testContext(overrides = {}) {
  const orderRepository = new MemoryOrderRepository();
  const sendMessage = vi.fn().mockResolvedValue({ message_id: 1 });
  const bot = {
    telegram: { sendMessage },
    webhookCallback: () => (_req, _res, next) => next()
  };
  const config = {
    NODE_ENV: 'test',
    TELEGRAM_BOT_TOKEN: '123456789:abcdefghijklmnopqrstuvwxyzABCDE',
    ALLOW_DEV_TELEGRAM_BYPASS: true,
    // Without this the router short-circuits to 503 and every assertion below
    // would be testing the "shop is closed" branch instead of the real path.
    ORDERS_ENABLED: true,
    INIT_DATA_MAX_AGE_SECONDS: 600,
    managerIds: [111],
    webhookPath: '/v1/telegram-webhook',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
    ...overrides
  };

  return {
    orderRepository,
    sendMessage,
    config,
    app: createApp({ orderRepository, bot, config })
  };
}

const validPayload = {
  items: [
    { menuItemId: 'pho-bo', quantity: 2 },
    { menuItemId: 'tra-tac', quantity: 1 }
  ],
  customer: {
    phone: '077 123 4567',
    address: '123 Đường Mới, Quận 1',
    note: 'Ít đá'
  },
  devTelegramUser: {
    id: 999001,
    username: 'customer_test',
    first_name: 'Khách'
  }
};

describe('POST /api/orders', () => {
  it('creates an order and recalculates the total from the server menu', async () => {
    const { app, sendMessage } = testContext();

    const response = await request(app).post('/api/orders').send({
      ...validPayload,
      clientTotal: 1
    });

    expect(response.status).toBe(201);
    expect(response.body.total).toBe(7000);
    expect(response.body.status).toBe('PENDING');
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid quantity', async () => {
    const { app } = testContext();

    const response = await request(app)
      .post('/api/orders')
      .send({
        ...validPayload,
        items: [{ menuItemId: 'pho-bo', quantity: 0 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid order payload');
  });

  it('rejects a request without Telegram authentication', async () => {
    const { app } = testContext({ ALLOW_DEV_TELEGRAM_BYPASS: false });
    const { devTelegramUser, ...payload } = validPayload;

    const response = await request(app).post('/api/orders').send(payload);

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/Telegram/);
  });

  it('rejects an unknown menu item', async () => {
    const { app } = testContext();

    const response = await request(app)
      .post('/api/orders')
      .send({
        ...validPayload,
        items: [{ menuItemId: 'not-found', quantity: 1 }]
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('unavailable');
  });

  it('refuses orders while ORDERS_ENABLED is false', async () => {
    const { app } = testContext({ ORDERS_ENABLED: false });

    const response = await request(app).post('/api/orders').send(validPayload);

    expect(response.status).toBe(503);
    expect(response.body.error).toContain('chưa mở nhận đơn');
  });

  it('answers 503 while the database is still connecting', async () => {
    const orderRepository = new MemoryOrderRepository();
    const bot = {
      telegram: { sendMessage: vi.fn() },
      webhookCallback: () => (_req, _res, next) => next()
    };
    const app = createApp({
      orderRepository,
      bot,
      isDatabaseReady: () => false,
      config: {
        NODE_ENV: 'test',
        ORDERS_ENABLED: true,
        ALLOW_DEV_TELEGRAM_BYPASS: true,
        INIT_DATA_MAX_AGE_SECONDS: 600,
        managerIds: [111],
        webhookPath: '/v1/telegram-webhook',
        TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
        TELEGRAM_BOT_TOKEN: '123456789:abcdefghijklmnopqrstuvwxyzABCDE'
      }
    });

    const response = await request(app).post('/api/orders').send(validPayload);

    expect(response.status).toBe(503);
  });

  it('still returns 201 when every manager notification fails', async () => {
    const orderRepository = new MemoryOrderRepository();
    const bot = {
      telegram: { sendMessage: vi.fn().mockRejectedValue(new Error('bot was blocked')) },
      webhookCallback: () => (_req, _res, next) => next()
    };
    const app = createApp({
      orderRepository,
      bot,
      config: {
        NODE_ENV: 'test',
        ORDERS_ENABLED: true,
        ALLOW_DEV_TELEGRAM_BYPASS: true,
        INIT_DATA_MAX_AGE_SECONDS: 600,
        managerIds: [111],
        webhookPath: '/v1/telegram-webhook',
        TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
        TELEGRAM_BOT_TOKEN: '123456789:abcdefghijklmnopqrstuvwxyzABCDE'
      }
    });

    const response = await request(app).post('/api/orders').send(validPayload);

    // The order is saved, so losing the notification must not lose the order.
    expect(response.status).toBe(201);
    expect(response.body.managerNotification).toBe('FAILED');
  });

  it('answers malformed JSON with 400 rather than 500', async () => {
    const { app } = testContext();

    const response = await request(app)
      .post('/api/orders')
      .set('content-type', 'application/json')
      .send('{"items": [');

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('JSON');
  });
});

describe('POST /api/orders idempotency', () => {
  it('returns the original order when the same key is replayed', async () => {
    const { app, sendMessage } = testContext();

    const first = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'retry-key-0001')
      .send(validPayload);
    const second = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'retry-key-0001')
      .send(validPayload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.orderId).toBe(first.body.orderId);
    expect(second.body.replayed).toBe(true);
    // The manager must be told about the order exactly once.
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('creates separate orders for different keys', async () => {
    const { app } = testContext();

    const first = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'key-aaaaaaaa')
      .send(validPayload);
    const second = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'key-bbbbbbbb')
      .send(validPayload);

    expect(second.body.orderId).not.toBe(first.body.orderId);
  });

  it('rejects a malformed idempotency key', async () => {
    const { app } = testContext();

    const response = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'short')
      .send(validPayload);

    expect(response.status).toBe(400);
  });

  it('refuses a key already used by a different customer', async () => {
    const { app } = testContext();

    await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'shared-key-001')
      .send(validPayload);

    const response = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'shared-key-001')
      .send({
        ...validPayload,
        devTelegramUser: { id: 424242, username: 'someone_else', first_name: 'Khác' }
      });

    expect(response.status).toBe(409);
  });
});

describe('GET /api/orders/:id', () => {
  it('returns the order to the customer who placed it', async () => {
    const { app } = testContext();

    const created = await request(app).post('/api/orders').send(validPayload);
    const response = await request(app)
      .get(`/api/orders/${created.body.orderId}`)
      .send({ devTelegramUser: validPayload.devTelegramUser });

    expect(response.status).toBe(200);
    expect(response.body.orderId).toBe(created.body.orderId);
    expect(response.body.total).toBe(7000);
  });

  it('hides another customer order behind a 404', async () => {
    const { app } = testContext();

    const created = await request(app).post('/api/orders').send(validPayload);
    const response = await request(app)
      .get(`/api/orders/${created.body.orderId}`)
      .send({ devTelegramUser: { id: 555000, first_name: 'Người lạ' } });

    expect(response.status).toBe(404);
  });

  it('lets a manager read any order', async () => {
    const { app } = testContext();

    const created = await request(app).post('/api/orders').send(validPayload);
    const response = await request(app)
      .get(`/api/orders/${created.body.orderId}`)
      .send({ devTelegramUser: { id: 111, first_name: 'Quản lý' } });

    expect(response.status).toBe(200);
  });

  it('requires authentication', async () => {
    const { app } = testContext({ ALLOW_DEV_TELEGRAM_BYPASS: false });

    const response = await request(app).get('/api/orders/whatever');

    expect(response.status).toBe(401);
  });
});

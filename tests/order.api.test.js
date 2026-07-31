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
    managerIds: [111],
    webhookPath: '/v1/telegram-webhook',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
    ...overrides
  };

  return {
    orderRepository,
    sendMessage,
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
    expect(response.body.total).toBe(150000);
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
    expect(response.body.error).toContain('Missing Telegram');
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
});

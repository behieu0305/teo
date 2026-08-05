// One test per finding from the security audit. Each of these was written
// against the broken code first and confirmed to fail there, so a regression
// re-breaks the suite instead of quietly shipping.
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { clientRateLimitKey, createApp } from '../src/app.js';
import { loadConfig } from '../src/config/env.js';
import { buildOrder } from '../src/domain/order.js';
import { MemoryOrderRepository } from '../src/repositories/memory-order-repository.js';
import { MongoOrderRepository } from '../src/repositories/mongo-order-repository.js';
import { createOrderActionHandler } from '../src/telegram/create-bot.js';
import { redactSecrets } from '../src/utils/logger.js';

const BOT_TOKEN = '123456789:abcdefghijklmnopqrstuvwxyzABCDE';

function baseConfig(overrides = {}) {
  return {
    NODE_ENV: 'test',
    TELEGRAM_BOT_TOKEN: BOT_TOKEN,
    ALLOW_DEV_TELEGRAM_BYPASS: true,
    ORDERS_ENABLED: true,
    INIT_DATA_MAX_AGE_SECONDS: 600,
    managerIds: [111],
    webhookPath: '/v1/telegram-webhook',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
    ...overrides
  };
}

const payload = {
  items: [{ menuItemId: 'pho-bo', quantity: 1 }],
  customer: { phone: '077 123 4567', address: '123 Đường Mới, Quận 1', note: '' },
  devTelegramUser: { id: 999001, username: 'customer_test', first_name: 'Khách' }
};

function testApp({ sendMessage, repository, config } = {}) {
  const orderRepository = repository ?? new MemoryOrderRepository();
  const bot = {
    telegram: { sendMessage: sendMessage ?? vi.fn().mockResolvedValue({ message_id: 1 }) },
    webhookCallback: () => (_req, _res, next) => next()
  };
  return {
    orderRepository,
    app: createApp({ orderRepository, bot, config: baseConfig(config) })
  };
}

// --- 1. Bot token leaking into the logs ------------------------------------
describe('log redaction', () => {
  it('strips a bot token out of a Telegram API error message', () => {
    // node-fetch builds this message verbatim when the API answers with
    // non-JSON, and Telegraf does not redact it on that path.
    const message = `invalid json response body at https://api.telegram.org/bot${BOT_TOKEN}/getMe reason: Unexpected token <`;

    const redacted = redactSecrets({ error: message });

    expect(redacted.error).not.toContain('abcdefghijklmnopqrstuvwxyz');
    expect(redacted.error).toContain('/bot123456789:<redacted>');
  });

  it('strips a bare token out of nested fields and arrays', () => {
    const redacted = redactSecrets({ errors: [{ reason: `token is ${BOT_TOKEN} here` }] });

    expect(redacted.errors[0].reason).toBe('token is <redacted> here');
  });

  it('leaves ordinary values alone', () => {
    expect(redactSecrets({ orderId: 'abc-123', total: 3000, ok: true })).toEqual({
      orderId: 'abc-123',
      total: 3000,
      ok: true
    });
  });
});

// --- 2. NODE_ENV must be explicit ------------------------------------------
describe('NODE_ENV', () => {
  const env = {
    PUBLIC_BASE_URL: 'https://example.com',
    MINI_APP_URL: 'https://example.com',
    TELEGRAM_BOT_TOKEN: BOT_TOKEN,
    TELEGRAM_MANAGER_IDS: '111',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
    MONGODB_URI: 'mongodb://localhost/test'
  };

  it('refuses to boot when NODE_ENV is missing', () => {
    // Every production guard is keyed on NODE_ENV === 'production'. Defaulting
    // to development turns all of them off for a deploy that just forgot it.
    expect(() => loadConfig({ ...env, NODE_ENV: undefined })).toThrow(/NODE_ENV/);
  });

  it('refuses a value outside the three known environments', () => {
    expect(() => loadConfig({ ...env, NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
  });
});

// --- 3. Sparse unique index vs an explicit null ------------------------------
describe('idempotencyKey storage', () => {
  // This is the assertion that matters, because the bug is a Mongo one: a
  // sparse unique index skips *missing* fields but happily indexes an explicit
  // null. buildOrder always emits idempotencyKey: null, so writing it through
  // meant only one key-less order could ever exist — every later one died on
  // E11000, and the route's recovery branch is gated on the key being truthy,
  // so it rethrows and the customer gets a 500 on a perfectly good order.
  const OrderModel = mongoose.models.Order;

  it('does not send idempotencyKey to Mongo when the client sent no key', async () => {
    const order = buildOrder({ payload, telegramUser: { id: 1, first_name: 'A' } });
    expect(order.idempotencyKey).toBeNull();

    const inserted = await captureInsert(order);

    expect(Object.hasOwn(inserted, 'idempotencyKey')).toBe(false);
  });

  it('leaves no idempotencyKey on the document mongoose would insert', () => {
    const order = buildOrder({ payload, telegramUser: { id: 1, first_name: 'A' } });
    const { id, createdAt, updatedAt, idempotencyKey, ...rest } = order;

    const document = new OrderModel({ ...rest, _id: id }).toObject();

    expect(document).not.toHaveProperty('idempotencyKey');
  });

  it('still stores the key when the client did send one', async () => {
    const order = buildOrder({
      payload,
      telegramUser: { id: 1, first_name: 'A' },
      idempotencyKey: 'real-key-00000001'
    });

    const inserted = await captureInsert(order);

    expect(inserted.idempotencyKey).toBe('real-key-00000001');
  });

  // Intercepts the document MongoOrderRepository hands to mongoose, so the
  // assertions above describe what really reaches the unique index without
  // needing a live mongod.
  async function captureInsert(order) {
    let document;
    const create = vi.spyOn(OrderModel, 'create').mockImplementation(async (doc) => {
      document = doc;
      return new OrderModel(doc);
    });
    try {
      await new MongoOrderRepository().create(order);
    } finally {
      create.mockRestore();
    }
    return document;
  }

  it('accepts a second order from a client that sends no key', async () => {
    const { app } = testApp();

    const first = await request(app).post('/api/orders').send(payload);
    const second = await request(app).post('/api/orders').send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.orderId).not.toBe(first.body.orderId);
  });

  it('answers a genuinely reused key with a replay, not a 500', async () => {
    const { app } = testApp();

    const first = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'shared-key-0000001')
      .send(payload);
    const second = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'shared-key-0000001')
      .send(payload);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(second.body.orderId).toBe(first.body.orderId);
  });
});

// --- 4. Ownership check on the E11000 recovery path -------------------------
describe('idempotency key ownership', () => {
  function racingRepository(winner) {
    const repository = new MemoryOrderRepository();
    // Reproduces the concurrent-submit race exactly: at the time we look the
    // key up it is not there yet, so we fall through to create() — and only
    // then does the unique index reject us, because another request committed
    // the same key in between. The winning document belongs to someone else.
    //
    // Returning the winner on the FIRST lookup instead would short-circuit into
    // the fast replay path above, which already checked ownership, and the test
    // would pass without ever reaching the branch it is meant to cover.
    let lookups = 0;
    repository.findByIdempotencyKey = async () => (lookups++ === 0 ? null : winner);
    repository.create = async () => {
      const error = new Error('E11000 duplicate key error');
      error.code = 11000;
      throw error;
    };
    return repository;
  }

  const someoneElsesOrder = {
    id: 'victim-order-id',
    telegramUserId: 424242,
    status: 'PENDING',
    total: 99000,
    managerNotification: 'DELIVERED'
  };

  it('does not hand another customer their order through the duplicate-key branch', async () => {
    const { app } = testApp({ repository: racingRepository(someoneElsesOrder) });

    const response = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'guessed-key-000001')
      .send(payload);

    expect(response.status).toBe(409);
    expect(JSON.stringify(response.body)).not.toContain('victim-order-id');
    expect(JSON.stringify(response.body)).not.toContain('99000');
  });

  it('still replays the caller their own order on that branch', async () => {
    const own = { ...someoneElsesOrder, id: 'own-order-id', telegramUserId: 999001 };
    const { app } = testApp({ repository: racingRepository(own) });

    const response = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'my-own-key-000001')
      .send(payload);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ orderId: 'own-order-id', replayed: true });
  });
});

// --- 5. A replay must not claim a delivery that never happened --------------
describe('replay honesty', () => {
  it('reports FAILED on replay when the original fan-out failed', async () => {
    const { app } = testApp({
      sendMessage: vi.fn().mockRejectedValue(new Error('bot was blocked'))
    });

    const first = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'retry-key-00000001')
      .send(payload);
    const replay = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'retry-key-00000001')
      .send(payload);

    expect(first.body.managerNotification).toBe('FAILED');
    expect(replay.status).toBe(200);
    expect(replay.body.replayed).toBe(true);
    // The old code answered DELIVERED here, so a customer whose order never
    // reached the shop was told to sit and wait for a confirmation.
    expect(replay.body.managerNotification).toBe('FAILED');
  });

  it('reports DELIVERED on replay when the original fan-out succeeded', async () => {
    const { app } = testApp();

    await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'good-key-000000001')
      .send(payload);
    const replay = await request(app)
      .post('/api/orders')
      .set('idempotency-key', 'good-key-000000001')
      .send(payload);

    expect(replay.body.managerNotification).toBe('DELIVERED');
  });
});

// --- 6. Every manager's copy of the card must be updated --------------------
describe('manager message fan-out', () => {
  it('records one message ref per manager that actually received the order', async () => {
    const repository = new MemoryOrderRepository();
    const sendMessage = vi
      .fn()
      .mockResolvedValueOnce({ message_id: 501 })
      .mockRejectedValueOnce(new Error('bot was blocked'))
      .mockResolvedValueOnce({ message_id: 503 });
    const bot = {
      telegram: { sendMessage },
      webhookCallback: () => (_req, _res, next) => next()
    };
    const app = createApp({
      orderRepository: repository,
      bot,
      config: baseConfig({ managerIds: [111, 222, 333] })
    });

    const response = await request(app).post('/api/orders').send(payload);
    const stored = await repository.findById(response.body.orderId);

    // Manager 222 blocked the bot, so there is no message of theirs to edit.
    expect(stored.managerMessages).toEqual([
      { chatId: 111, messageId: 501 },
      { chatId: 333, messageId: 503 }
    ]);
    expect(stored.managerNotification).toBe('DELIVERED');
  });

  it('edits every manager copy on a status change, not just the tapped one', async () => {
    const orderRepository = new MemoryOrderRepository();
    const order = buildOrder({ payload, telegramUser: { id: 999001, first_name: 'Khách' } });
    await orderRepository.create(order);
    await orderRepository.recordManagerNotification(order.id, {
      managerMessages: [
        { chatId: 111, messageId: 501 },
        { chatId: 222, messageId: 502 }
      ],
      managerNotification: 'DELIVERED'
    });

    const handle = createOrderActionHandler({ orderRepository, managerIds: [111, 222] });
    const ctx = managerCtx({ managerId: 111, orderId: order.id });

    await handle(ctx);

    expect(ctx.telegram.editMessageText.mock.calls.map((call) => [call[0], call[1]])).toEqual([
      [111, 501],
      [222, 502]
    ]);
    // The tapped message is covered by the refs above, so the single-message
    // fallback must not fire and edit manager 111's card a second time.
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('does not let one blocked manager stop the other cards updating', async () => {
    const orderRepository = new MemoryOrderRepository();
    const order = buildOrder({ payload, telegramUser: { id: 999001, first_name: 'Khách' } });
    await orderRepository.create(order);
    await orderRepository.recordManagerNotification(order.id, {
      managerMessages: [
        { chatId: 111, messageId: 501 },
        { chatId: 222, messageId: 502 }
      ],
      managerNotification: 'DELIVERED'
    });

    const handle = createOrderActionHandler({ orderRepository, managerIds: [111, 222] });
    const ctx = managerCtx({ managerId: 111, orderId: order.id });
    ctx.telegram.editMessageText
      .mockRejectedValueOnce(new Error('message to edit not found'))
      .mockResolvedValueOnce(true);

    await expect(handle(ctx)).resolves.toBeUndefined();

    expect(ctx.telegram.editMessageText).toHaveBeenCalledTimes(2);
    // The customer still gets told, even though one manager edit blew up.
    expect(ctx.telegram.sendMessage).toHaveBeenCalledWith(999001, expect.stringContaining('👨‍🍳'));
  });

  it('falls back to the tapped message for orders created before refs existed', async () => {
    const orderRepository = new MemoryOrderRepository();
    const order = buildOrder({ payload, telegramUser: { id: 999001, first_name: 'Khách' } });
    await orderRepository.create(order);

    const handle = createOrderActionHandler({ orderRepository, managerIds: [111] });
    const ctx = managerCtx({ managerId: 111, orderId: order.id });

    await handle(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    expect(ctx.telegram.editMessageText).not.toHaveBeenCalled();
  });
});

function managerCtx({ managerId, orderId, action = 'confirm' }) {
  return {
    from: { id: managerId },
    match: [null, action, orderId],
    answerCbQuery: vi.fn().mockResolvedValue(true),
    editMessageText: vi.fn().mockResolvedValue(true),
    telegram: {
      editMessageText: vi.fn().mockResolvedValue(true),
      sendMessage: vi.fn().mockResolvedValue(true)
    }
  };
}

// --- 7. Expired initData is recoverable, not a dead end ---------------------
describe('expired Telegram session', () => {
  it('defaults to a window a real ordering session can survive', () => {
    // initData is minted once when the Mini App opens and never refreshes, so
    // this value is a cap on session length, not on request latency.
    const config = loadConfig({
      NODE_ENV: 'test',
      PUBLIC_BASE_URL: 'https://example.com',
      MINI_APP_URL: 'https://example.com',
      TELEGRAM_BOT_TOKEN: BOT_TOKEN,
      TELEGRAM_MANAGER_IDS: '111',
      TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
      MONGODB_URI: 'mongodb://localhost/test'
    });

    expect(config.INIT_DATA_MAX_AGE_SECONDS).toBeGreaterThanOrEqual(3600);
  });

  it('tells an expired caller how to recover instead of "invalid session"', async () => {
    const { app } = testApp({ config: { ALLOW_DEV_TELEGRAM_BYPASS: false } });

    const response = await request(app)
      .post('/api/orders')
      .set('x-telegram-init-data', signedInitData({ ageSeconds: 999_999 }))
      .send(payload);

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INIT_DATA_EXPIRED');
    expect(response.body.error).toMatch(/mở lại ứng dụng/i);
  });

  it('still reports a forged signature as a plain invalid session', async () => {
    const { app } = testApp({ config: { ALLOW_DEV_TELEGRAM_BYPASS: false } });

    const response = await request(app)
      .post('/api/orders')
      .set('x-telegram-init-data', 'user=%7B%22id%22%3A1%7D&auth_date=1&hash=' + 'f'.repeat(64))
      .send(payload);

    expect(response.status).toBe(401);
    expect(response.body.code).toBeUndefined();
  });
});

function signedInitData({ ageSeconds }) {
  // Signed here rather than imported from the verifier, so the test proves the
  // route rejects genuinely-Telegram-signed-but-old data, not our own helper.
  const authDate = Math.floor(Date.now() / 1000) - ageSeconds;
  const params = new URLSearchParams({
    auth_date: String(authDate),
    user: JSON.stringify({ id: 999001, first_name: 'Khách' })
  });
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  const secret = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
  params.set('hash', crypto.createHmac('sha256', secret).update(dataCheckString).digest('hex'));
  return params.toString();
}

// --- 8. IPv6 rate-limit buckets --------------------------------------------
describe('rate limit key', () => {
  const key = (ip) => clientRateLimitKey({ ip });

  it('gives one IPv4 client one bucket', () => {
    expect(key('203.0.113.9')).toBe('203.0.113.9');
  });

  it('collapses a whole IPv6 /64 into one bucket', () => {
    // A residential IPv6 customer owns at least a /64. Keying on the full /128
    // hands one person 2^64 separate order budgets.
    const first = key('2001:db8:1234:5678:0000:0000:0000:0001');
    const second = key('2001:db8:1234:5678:ffff:ffff:ffff:ffff');

    expect(first).toBe(second);
  });

  it('keeps two different /64s apart', () => {
    expect(key('2001:db8:1234:5678::1')).not.toBe(key('2001:db8:1234:9999::1'));
  });

  it('normalises compressed and expanded forms to the same bucket', () => {
    expect(key('2001:db8::1')).toBe(key('2001:0db8:0000:0000:0000:0000:0000:0001'));
  });

  it('unwraps an IPv4-mapped address instead of treating it as IPv6', () => {
    expect(key('::ffff:203.0.113.9')).toBe('203.0.113.9');
  });

  it('ignores a link-local zone id', () => {
    expect(key('fe80::1%eth0')).toBe(key('fe80::2'));
  });

  it('never returns an empty key for a missing ip', () => {
    expect(key(undefined)).toBe('unknown');
  });
});

// --- 8b. Client address resolution behind Railway's edge --------------------
describe('client address source', () => {
  const key = (headers, ip) =>
    clientRateLimitKey({ ip, get: (name) => headers[name.toLowerCase()] });

  it('prefers Railway’s documented X-Real-IP over a forwarded-for guess', () => {
    // Railway does not document whether it appends to or replaces a
    // client-supplied X-Forwarded-For, so req.ip (the last XFF entry under
    // `trust proxy: 1`) may be attacker-controlled. X-Real-IP is the header
    // Railway does document as the client's remote IP.
    expect(key({ 'x-real-ip': '203.0.113.9' }, '198.51.100.7')).toBe('203.0.113.9');
  });

  it('collapses an X-Real-IP /64 the same way', () => {
    expect(key({ 'x-real-ip': '2001:db8:1:2::1' })).toBe(key({ 'x-real-ip': '2001:db8:1:2::99' }));
  });

  it('falls back to req.ip when the header is absent or blank', () => {
    expect(key({}, '203.0.113.9')).toBe('203.0.113.9');
    expect(key({ 'x-real-ip': '   ' }, '203.0.113.9')).toBe('203.0.113.9');
  });

  it('works on a request object with no get() at all', () => {
    expect(clientRateLimitKey({ ip: '203.0.113.9' })).toBe('203.0.113.9');
  });

  it('strips brackets and a port so one address is one bucket', () => {
    // express hands X-Forwarded-For entries back unnormalised, so "[::1]",
    // "[::1]:443" and "::1" would otherwise be three separate budgets.
    expect(key({ 'x-real-ip': '[2001:db8::1]' })).toBe(key({ 'x-real-ip': '2001:db8::1' }));
    expect(key({ 'x-real-ip': '[2001:db8::1]:443' })).toBe(key({ 'x-real-ip': '2001:db8::1' }));
  });
});

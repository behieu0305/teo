import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryOrderRepository } from '../src/repositories/memory-order-repository.js';

function createTestApp(overrides = {}) {
  const bot = {
    telegram: { sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }) },
    webhookCallback: () => (_req, _res, next) => next()
  };
  const config = {
    NODE_ENV: 'test',
    ORDERS_ENABLED: false,
    webhookPath: '/v1/telegram-webhook',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
    managerIds: [111],
    ...overrides
  };
  return createApp({
    orderRepository: new MemoryOrderRepository(),
    bot,
    config,
    isDatabaseReady: () => true
  });
}

describe('Telegram Web embeddability', () => {
  // Telegram's web clients open Mini Apps in an iframe
  // (https://core.telegram.org/api/web-events). frame-ancestors 'self' or
  // X-Frame-Options: SAMEORIGIN makes the app blank on web.telegram.org.
  it('allows Telegram origins to frame the Mini App', async () => {
    const response = await request(createTestApp()).get('/');

    expect(response.status).toBe(200);
    const csp = response.headers['content-security-policy'];
    expect(csp).toMatch(/frame-ancestors[^;]*https:\/\/web\.telegram\.org/);
    expect(csp).toMatch(/frame-ancestors[^;]*https:\/\/\*\.telegram\.org/);
  });

  it('does not send an X-Frame-Options header that contradicts frame-ancestors', async () => {
    const response = await request(createTestApp()).get('/');
    expect(response.headers['x-frame-options']).toBeUndefined();
  });

  it('still blocks arbitrary third-party framing', async () => {
    const response = await request(createTestApp()).get('/');
    const frameAncestors = response.headers['content-security-policy']
      .split(';')
      .find((directive) => directive.trim().startsWith('frame-ancestors'));

    expect(frameAncestors).toBeDefined();
    expect(frameAncestors).not.toContain("'*'");
    expect(frameAncestors.trim()).not.toBe('frame-ancestors *');
  });
});

describe('rate limiting behind the Railway proxy', () => {
  it('keys the limiter on the forwarded client IP, not the proxy', async () => {
    const app = createTestApp();

    const first = await request(app).get('/api/menu').set('x-forwarded-for', '203.0.113.10');
    const second = await request(app).get('/api/menu').set('x-forwarded-for', '203.0.113.11');

    // Distinct visitors must not share one bucket.
    expect(first.headers['ratelimit-remaining']).toBe(second.headers['ratelimit-remaining']);
  });

  it('gives order creation a tighter budget than menu browsing', async () => {
    const app = createTestApp();

    const menu = await request(app).get('/api/menu').set('x-forwarded-for', '203.0.113.20');
    const order = await request(app)
      .post('/api/orders')
      .set('x-forwarded-for', '203.0.113.20')
      .send({});

    expect(Number(order.headers['ratelimit-limit'])).toBeLessThan(
      Number(menu.headers['ratelimit-limit'])
    );
  });
});

describe('static asset serving', () => {
  it('serves the Mini App regardless of the process working directory', async () => {
    const originalCwd = process.cwd();
    process.chdir('/');
    try {
      const response = await request(createTestApp()).get('/');
      expect(response.status).toBe(200);
      expect(response.text).toContain('telegram-web-app.js');
    } finally {
      process.chdir(originalCwd);
    }
  });
});

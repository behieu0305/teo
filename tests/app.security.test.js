import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { MemoryOrderRepository } from '../src/repositories/memory-order-repository.js';

function buildApp() {
  return createApp({
    orderRepository: new MemoryOrderRepository(),
    bot: {
      telegram: { sendMessage: vi.fn() },
      webhookCallback: () => (_req, _res, next) => next()
    },
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
}

describe('security headers', () => {
  it('lets Telegram Web embed the Mini App in an iframe', async () => {
    const response = await request(buildApp()).get('/health');
    const csp = response.headers['content-security-policy'];

    expect(csp).toContain('frame-ancestors');
    expect(csp).toContain('https://web.telegram.org');
    // X-Frame-Options cannot express more than one origin and would override
    // frame-ancestors in older browsers, so it must not be sent at all.
    expect(response.headers['x-frame-options']).toBeUndefined();
  });

  it('allows the Telegram Mini App SDK but nothing else', async () => {
    const csp = (await request(buildApp()).get('/health')).headers['content-security-policy'];

    expect(csp).toContain("script-src 'self' https://telegram.org");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('allows the webfont stylesheet the page actually links', async () => {
    const csp = (await request(buildApp()).get('/health')).headers['content-security-policy'];

    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
  });

  it('does not leak the Express fingerprint', async () => {
    const response = await request(buildApp()).get('/health');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('trusts the Railway proxy so clients get separate buckets', async () => {
    const app = buildApp();
    expect(app.get('trust proxy')).toBe(1);

    const first = await request(app).get('/api/menu').set('x-forwarded-for', '1.1.1.1');
    const second = await request(app).get('/api/menu').set('x-forwarded-for', '2.2.2.2');

    // Both callers see a full budget; with trust proxy off they shared one.
    expect(first.headers['ratelimit-remaining']).toBe(second.headers['ratelimit-remaining']);
  });
});

describe('routing', () => {
  it('serves the Mini App shell regardless of the process working directory', async () => {
    const response = await request(buildApp()).get('/index.html');

    expect(response.status).toBe(200);
    expect(response.text).toContain('Saigon Street Food');
  });

  it('answers unknown API routes with JSON, not the SPA', async () => {
    const response = await request(buildApp()).get('/api/does-not-exist');

    expect(response.status).toBe(404);
    expect(response.body.error).toBe('API route not found');
  });

  it('reports readiness separately from liveness', async () => {
    const app = createApp({
      orderRepository: new MemoryOrderRepository(),
      bot: {
        telegram: { sendMessage: vi.fn() },
        webhookCallback: () => (_req, _res, next) => next()
      },
      isDatabaseReady: () => false,
      config: {
        NODE_ENV: 'test',
        ORDERS_ENABLED: true,
        managerIds: [111],
        INIT_DATA_MAX_AGE_SECONDS: 600,
        webhookPath: '/v1/telegram-webhook',
        TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345',
        TELEGRAM_BOT_TOKEN: '123456789:abcdefghijklmnopqrstuvwxyzABCDE'
      }
    });

    // Railway must keep the container alive while Mongo is still starting.
    await expect(request(app).get('/health').expect(200)).resolves.toBeTruthy();
    await expect(request(app).get('/ready').expect(503)).resolves.toBeTruthy();
  });
});

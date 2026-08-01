import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { menuCatalog } from '../src/domain/menu.js';
import { MemoryOrderRepository } from '../src/repositories/memory-order-repository.js';

function createTestApp() {
  const bot = {
    telegram: { sendMessage: vi.fn() },
    webhookCallback: () => (_req, _res, next) => next()
  };
  const config = {
    ORDERS_ENABLED: false,
    webhookPath: '/v1/telegram-webhook',
    TELEGRAM_WEBHOOK_SECRET: 'test_secret_token_12345'
  };
  return createApp({
    orderRepository: new MemoryOrderRepository(),
    bot,
    config,
    isDatabaseReady: () => true
  });
}

describe('frontend assets', () => {
  it('allows the exact Google Fonts origins used by the page', async () => {
    const response = await request(createTestApp()).get('/');
    expect(response.status).toBe(200);
    const csp = response.headers['content-security-policy'];
    expect(csp).toContain('https://fonts.googleapis.com');
    expect(csp).toContain('https://fonts.gstatic.com');
  });

  it('contains all 58 supplied menu items with unique local image URLs', () => {
    expect(menuCatalog).toHaveLength(58);
    const urls = menuCatalog.map((item) => item.imageUrl);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.every((url) => /^\/images\/menu\/\d{2}-[a-z0-9-]+\.webp$/.test(url))).toBe(true);
  });

  it('serves menu images as cacheable WebP files', async () => {
    const response = await request(createTestApp()).get(menuCatalog[0].imageUrl);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/webp');
    expect(response.headers['cache-control']).toContain('immutable');
    expect(response.body.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(response.body.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it('provides a local fallback image', async () => {
    const response = await request(createTestApp()).get('/images/menu/fallback.svg');
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('image/svg+xml');
  });
});

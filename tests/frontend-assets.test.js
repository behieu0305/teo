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

  it('serves the stylesheets the page links', async () => {
    const app = createTestApp();
    for (const href of ['/styles.css', '/manus-fixes.css']) {
      const response = await request(app).get(href);
      expect(response.status, `${href} must be served`).toBe(200);
    }
  });

  it('does not reuse the same image URL for different dishes', () => {
    // Dishes without a photo all share the placeholder by design, so only the
    // ones carrying a real photo are required to be distinct. Reusing a photo
    // is what put a picture of bún bò on the mango smoothie.
    const urls = menuCatalog.map((item) => item.imageUrl).filter(Boolean);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('removes the known false image mappings', () => {
    const falseMappings = new Set([
      '/images/menu/bo-kho.webp',
      '/images/menu/com-ga.webp',
      '/images/menu/banh-mi-thit-nuong.webp',
      '/images/menu/bun-thit-nuong.webp',
      '/images/menu/mi-xao-bo.webp',
      '/images/menu/khoai-tay-chien.webp',
      '/images/menu/tra-tac.webp',
      '/images/menu/ca-phe-sua.webp',
      '/images/menu/sinh-to-xoai.webp'
    ]);
    expect(menuCatalog.some((item) => falseMappings.has(item.imageUrl))).toBe(false);
  });
});

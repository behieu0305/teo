import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { menuCatalog } from './domain/menu.js';
import { createOrderRouter } from './routes/order-routes.js';

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

// Telegram web clients (web.telegram.org /k/ and /a/) render Mini Apps inside an
// iframe, so the page must stay embeddable from Telegram origins.
// See https://core.telegram.org/api/web-events
const TELEGRAM_FRAME_ANCESTORS = [
  "'self'",
  'https://telegram.org',
  'https://*.telegram.org',
  'https://web.telegram.org',
  'https://*.t.me'
];

export function createApp({ orderRepository, bot, config, isDatabaseReady = () => true }) {
  const app = express();

  app.disable('x-powered-by');
  // Railway terminates TLS in front of the app. Without this, req.ip is the edge
  // proxy address for every visitor and the rate limiter shares one bucket.
  // A fixed hop count (not `true`) prevents X-Forwarded-For spoofing.
  app.set('trust proxy', 1);
  app.use(
    helmet({
      // X-Frame-Options cannot express an allowlist; CSP frame-ancestors below
      // is the enforcing mechanism and would be contradicted by SAMEORIGIN.
      frameguard: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://telegram.org'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: TELEGRAM_FRAME_ANCESTORS
        }
      }
    })
  );
  app.use(express.json({ limit: '64kb' }));

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 120,
      standardHeaders: true,
      legacyHeaders: false
    })
  );

  // Order creation notifies every manager on Telegram, so it gets a tighter
  // per-IP budget than menu browsing.
  app.use(
    '/api/orders',
    rateLimit({
      windowMs: 60_000,
      limit: 10,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Bạn gửi đơn quá nhanh. Vui lòng thử lại sau một phút.' }
    })
  );

  // Liveness: Railway only needs the web process to be reachable.
  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      database: isDatabaseReady() ? 'connected' : 'connecting'
    });
  });

  // Readiness: useful for manual checks and monitoring.
  app.get('/ready', (_req, res) => {
    const ready = isDatabaseReady();
    res.status(ready ? 200 : 503).json({
      ok: ready,
      database: ready ? 'connected' : 'unavailable'
    });
  });

  app.get('/api/config', (_req, res) => {
    res.json({
      orderingEnabled: config.ORDERS_ENABLED,
      currencyLabel: 'Rs',
      shopName: 'Saigon Street Food',
      location: 'Colombo',
      openingHours: '07:00 AM – 05:00 PM'
    });
  });
  app.get('/api/menu', (_req, res) => {
    res.json(menuCatalog.filter((item) => item.available));
  });
  app.use(
    '/api/orders',
    createOrderRouter({ orderRepository, bot, config, isDatabaseReady })
  );

  app.use(
    bot.webhookCallback(config.webhookPath, {
      secretToken: config.TELEGRAM_WEBHOOK_SECRET
    })
  );
  // Absolute path: a relative one silently breaks whenever the process is
  // started from a directory other than the repository root.
  app.use(express.static(publicDir));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

import express from 'express';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { menuCatalog } from './domain/menu.js';
import { menuImageIndex } from './domain/menu-image-index.js';
import { createOrderRouter } from './routes/order-routes.js';

const menuImagePackPaths = Array.from({ length: 8 }, (_unused, index) =>
  fileURLToPath(
    new URL(
      `../public/images/menu/menu-images-${String(index + 1).padStart(2, '0')}.pack`,
      import.meta.url
    )
  )
);
const menuImagePacks = new Map();

function getMenuImagePack(part) {
  if (!Number.isInteger(part) || part < 1 || part > menuImagePackPaths.length) {
    return null;
  }
  if (!menuImagePacks.has(part)) {
    menuImagePacks.set(part, readFileSync(menuImagePackPaths[part - 1]));
  }
  return menuImagePacks.get(part);
}

export function createApp({ orderRepository, bot, config, isDatabaseReady = () => true }) {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://telegram.org'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"]
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

  app.get('/health', (_req, res) => {
    res.status(200).json({
      ok: true,
      database: isDatabaseReady() ? 'connected' : 'connecting'
    });
  });

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

  app.get('/images/menu/:filename', (req, res, next) => {
    const match = /^([a-z0-9-]+)\.webp$/.exec(req.params.filename);
    if (!match) return next();

    const range = menuImageIndex[match[1]];
    if (!range) return next();

    const [part, offset, length] = range;
    const pack = getMenuImagePack(part);
    if (!pack || offset < 0 || length <= 0 || offset + length > pack.length) return next();
    const image = pack.subarray(offset, offset + length);
    res.set({
      'Content-Type': 'image/webp',
      'Content-Length': String(image.length),
      'Cache-Control': 'public, max-age=31536000, immutable'
    });
    return res.send(image);
  });

  app.use(
    bot.webhookCallback(config.webhookPath, {
      secretToken: config.TELEGRAM_WEBHOOK_SECRET
    })
  );
  app.use(express.static('public'));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

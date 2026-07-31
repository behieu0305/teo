import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { menuCatalog } from './domain/menu.js';
import { createOrderRouter } from './routes/order-routes.js';

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

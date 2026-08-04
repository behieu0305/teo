import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { CATEGORIES, menuCatalog } from './domain/menu.js';
import { createOrderRouter } from './routes/order-routes.js';
import { logger, requestLogger } from './utils/logger.js';

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');

// Telegram Web renders a Mini App inside an iframe on these origins. Without
// them the app is a blank frame for every desktop/web user while still working
// on mobile, which makes the breakage easy to miss.
const TELEGRAM_FRAME_ANCESTORS = ['https://web.telegram.org', 'https://*.telegram.org'];

// The shop is in Colombo; Railway containers run on UTC. Keeping the zone next
// to the hours means the open/closed badge is judged by the shop's clock.
const SHOP_TIMEZONE = 'Asia/Colombo';
const SHOP_OPENS_AT = '07:00';
const SHOP_CLOSES_AT = '17:00';

export function createApp({ orderRepository, bot, config, isDatabaseReady = () => true }) {
  const app = express();

  app.disable('x-powered-by');
  // Railway terminates TLS at its edge proxy, so without this every client
  // shares one rate-limit bucket and express-rate-limit refuses to trust
  // X-Forwarded-For. Use 1 (the single Railway hop), never `true`.
  app.set('trust proxy', 1);

  app.use(requestLogger());
  app.use(
    helmet({
      // X-Frame-Options cannot express more than one allowed origin and would
      // contradict the frame-ancestors list below, so let CSP own framing.
      frameguard: false,
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", 'https://telegram.org'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          frameAncestors: ["'self'", ...TELEGRAM_FRAME_ANCESTORS]
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

  // Every accepted order fans out a Telegram message to every manager, so this
  // endpoint gets a much tighter per-IP budget than menu browsing does.
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

  // The page used to hardcode t.me/saigonstreetfood_bot, which is a dead link
  // the moment the real bot has a different username. Ask Telegram once and
  // cache; if the call fails the client simply hides the link.
  let botUsername = null;
  let botUsernameResolved = false;
  async function resolveBotUsername() {
    if (botUsernameResolved) return botUsername;
    botUsernameResolved = true;
    try {
      botUsername = (await bot.telegram?.getMe?.())?.username ?? null;
    } catch (error) {
      logger.warn('bot_username_unavailable', { error: error.message });
    }
    return botUsername;
  }

  app.get('/api/config', async (_req, res) => {
    res.json({
      botUsername: await resolveBotUsername(),
      orderingEnabled: config.ORDERS_ENABLED,
      currencyLabel: 'Rs',
      shopName: 'Saigon Street Food',
      location: 'Colombo',
      openingHours: '07:00 AM – 05:00 PM',
      // Machine-readable twins of openingHours. The badge used to be hardcoded
      // to "Đang mở cửa", so a customer opening the app at midnight was told the
      // shop was open. The client needs the zone too: it must judge by the
      // shop's clock, not by whatever timezone the customer's phone is in.
      opensAt: SHOP_OPENS_AT,
      closesAt: SHOP_CLOSES_AT,
      timezone: SHOP_TIMEZONE
    });
  });
  app.get('/api/menu', (_req, res) => {
    const items = menuCatalog.filter((item) => item.available);
    // Categories ship with the menu so the client renders them in the shop's
    // intended order rather than in whatever order the dishes happen to arrive.
    res.json({
      categories: CATEGORIES.filter((category) =>
        items.some((item) => item.category === category.id)
      ),
      items
    });
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
  app.use(express.static(PUBLIC_DIR));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use((error, req, res, _next) => {
    // body-parser reports malformed JSON as a 400 on the error object. Passing
    // that through keeps a client-side mistake from being counted as a server
    // fault by both the caller and our own alerting.
    const status = Number(error.status ?? error.statusCode);
    if (Number.isInteger(status) && status >= 400 && status < 500) {
      logger.warn('client_error', { requestId: req.id, status, error: error.message });
      return res.status(status).json({
        error:
          error.type === 'entity.parse.failed'
            ? 'Dữ liệu gửi lên không phải JSON hợp lệ.'
            : 'Yêu cầu không hợp lệ.'
      });
    }

    logger.error('unhandled_error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

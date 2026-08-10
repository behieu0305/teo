import net from 'node:net';
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
//
// The shop now trades round the clock. The window is kept as a real 00:00–24:00
// span rather than deleting the badge, so isShopOpen() still answers a genuine
// question and the badge can go back to real hours by editing these two lines.
// 24:00 (not 00:00) is deliberate: an open === close window would make
// `now >= open && now < close` false at every minute of the day and read as
// permanently closed.
const SHOP_TIMEZONE = 'Asia/Colombo';
const SHOP_OPENS_AT = '00:00';
const SHOP_CLOSES_AT = '24:00';

// express-rate-limit keys on req.ip, which for an IPv6 client is a full /128
// address. Every IPv6 customer is handed at least a /64 by their ISP, so one
// person can walk 2^64 addresses inside their own allocation and get a fresh
// 10-orders-per-minute budget for each one — the limit stops existing exactly
// where it is needed. Buckets are therefore keyed on the /64 prefix, which is
// the smallest unit an operator actually hands out.
function ipv6Prefix64(address) {
  const [head, tail] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail ? tail.split(':') : [];
  const groups =
    tail === undefined
      ? headGroups
      : [
          ...headGroups,
          ...Array(Math.max(8 - headGroups.length - tailGroups.length, 0)).fill('0'),
          ...tailGroups
        ];

  return groups
    .slice(0, 4)
    .map((group) => (group || '0').toLowerCase().padStart(4, '0'))
    .join(':');
}

// Railway's edge sets X-Real-IP and documents it as "for identifying client's
// remote IP". It does NOT document what it does with a client-supplied
// X-Forwarded-For — append, replace or pass through — and support confirmed the
// behaviour is undocumented. `trust proxy: 1` makes req.ip the last XFF entry,
// which is the real client only if the edge appends. Rather than bet the rate
// limiter on an undocumented detail, prefer the header Railway does document,
// and keep req.ip as the fallback for local runs and tests where it is absent.
function clientAddress(req) {
  const realIp = req.get?.('x-real-ip')?.trim();
  if (realIp) return realIp;
  return req.ip;
}

// Logged once per process so the assumption above can be checked against a real
// request in the Railway logs instead of being taken on trust. One line per
// deploy is cheap; getting this wrong silently is not.
let forwardingLogged = false;
export function logForwardingHeadersOnce(req) {
  if (forwardingLogged) return;
  forwardingLogged = true;
  logger.info('client_ip_resolution', {
    xForwardedFor: req.get?.('x-forwarded-for') ?? null,
    xRealIp: req.get?.('x-real-ip') ?? null,
    reqIp: req.ip ?? null,
    resolvedKey: clientRateLimitKey(req)
  });
}

export function clientRateLimitKey(req) {
  const ip = clientAddress(req);
  if (!ip) {
    // Replacing the default keyGenerator also drops the library's own warning
    // for this case. It matters: with no address every caller shares a single
    // bucket, so the whole API throttles at one client's budget.
    logger.warn('rate_limit_missing_ip', { requestId: req.id });
    return 'unknown';
  }
  // Express hands back whatever the proxy wrote, unnormalised: an
  // X-Forwarded-For entry may legitimately arrive as "[2001:db8::1]" or
  // "[2001:db8::1]:443". Left alone, each spelling of one address is a separate
  // bucket, which is the very rotation this function exists to stop. Strip the
  // brackets, any port, and a link-local zone id ("fe80::1%eth0") first.
  const address = ip
    .replace(/^\[([^\]]+)\](?::\d+)?$/, '$1')
    .split('%')[0];

  if (net.isIPv4(address)) return address;
  // ::ffff:203.0.113.9 is an IPv4 client arriving on a dual-stack socket.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address);
  if (mapped) return mapped[1];
  if (!net.isIPv6(address)) return address;

  return `${ipv6Prefix64(address)}::/64`;
}

export function createApp({ orderRepository, bot, config, isDatabaseReady = () => true }) {
  const app = express();

  app.disable('x-powered-by');
  // Railway terminates TLS at its edge proxy, so express has to be told to read
  // the forwarded headers at all.
  //
  // The value is deliberately NOT what makes req.ip correct — it cannot be.
  // Measured against the live deploy, Railway sends:
  //   X-Forwarded-For: <real client>, <Railway internal router>
  //   X-Real-IP:       <real client>
  // That is TWO hops, not one. With `trust proxy: 1` express hands back the
  // LAST forwarded entry, which is Railway's own internal address — a constant
  // that is identical for every visitor on earth. An earlier version of this
  // comment claimed "1 (the single Railway hop)"; it was wrong, and the cost of
  // being wrong was that every customer shared one rate-limit bucket, so ten
  // orders a minute was a limit on the whole shop rather than on one person.
  //
  // Anything that needs the real caller must therefore go through
  // clientRateLimitKey() above, which reads X-Real-IP. Raising this to 2 would
  // happen to work today but re-breaks the moment Railway adds or drops a hop.
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
      legacyHeaders: false,
      keyGenerator: (req) => {
        logForwardingHeadersOnce(req);
        return clientRateLimitKey(req);
      }
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
      keyGenerator: clientRateLimitKey,
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
      openingHours: 'Luôn mở 24/24',
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

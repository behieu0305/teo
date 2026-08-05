import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  // Deliberately NOT defaulted. Every production guard below — the ban on
  // ALLOW_DEV_TELEGRAM_BYPASS, the HTTPS requirement — lives inside
  // `if (NODE_ENV === 'production')`. With a default, a deploy that simply
  // forgets the variable silently runs with all of them switched off, which is
  // the exact opposite of what a default is meant to protect against. Refusing
  // to boot is the safe failure: it is loud, immediate, and fixed in one click.
  NODE_ENV: z.enum(['development', 'test', 'production'], {
    message:
      'NODE_ENV must be set explicitly to development, test or production — the production safety checks are keyed on it'
  }),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url(),
  MINI_APP_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(20),
  TELEGRAM_MANAGER_IDS: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).max(256).regex(/^[A-Za-z0-9_-]+$/),
  MONGODB_URI: z.string().min(1),
  ALLOW_DEV_TELEGRAM_BYPASS: booleanFromString,
  AUTO_SET_WEBHOOK: booleanFromString.default('true'),
  ORDERS_ENABLED: booleanFromString.default('false'),
  // Telegram mints initData once, when the Mini App is opened, and never
  // refreshes it: auth_date is frozen at launch for the whole session (the
  // client only calls messages.prolongWebView, which issues nothing new). So
  // this is not a request-latency budget — it is a cap on how long a customer
  // may keep the app open before their order is rejected.
  //
  // At 600s anyone who browsed 58 dishes, typed a phone number and an address,
  // then hit "Gửi đơn hàng" more than ten minutes after opening got a 401 and
  // lost the order, with no way to recover but to reopen the app. An hour keeps
  // a leaked initData from being useful indefinitely while costing no real
  // orders. Raise it if customers still hit the wall; the exposure is limited
  // to placing orders as the victim (no payment data is involved).
  INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().max(86_400).default(3600)
});

function railwayPublicUrl(raw) {
  const domain = raw.RAILWAY_PUBLIC_DOMAIN?.trim();
  return domain ? `https://${domain}` : undefined;
}

export function loadConfig(overrides = {}) {
  const raw = { ...process.env, ...overrides };
  const configuredPublicUrl = raw.PUBLIC_BASE_URL?.trim() || railwayPublicUrl(raw);
  const publicUrl = configuredPublicUrl || (raw.NODE_ENV === 'production' ? 'https://pending.invalid' : 'http://localhost:3000');
  const miniAppUrl = raw.MINI_APP_URL?.trim() || publicUrl;

  const parsed = schema.safeParse({
    ...raw,
    PUBLIC_BASE_URL: publicUrl,
    MINI_APP_URL: miniAppUrl
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  // Number('') is 0 and passes Number.isSafeInteger, so blanks from a trailing
  // comma have to be dropped before the conversion or they become manager 0.
  const managerIds = [
    ...new Set(
      parsed.data.TELEGRAM_MANAGER_IDS.split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map(Number)
        .filter((value) => Number.isSafeInteger(value) && value > 0)
    )
  ];

  if (managerIds.length === 0) {
    throw new Error('Invalid environment configuration: TELEGRAM_MANAGER_IDS must contain at least one numeric Telegram ID');
  }

  if (parsed.data.NODE_ENV === 'production') {
    if (parsed.data.ALLOW_DEV_TELEGRAM_BYPASS) {
      throw new Error('Invalid environment configuration: ALLOW_DEV_TELEGRAM_BYPASS must be false in production');
    }

    for (const [name, value] of [
      ['PUBLIC_BASE_URL', parsed.data.PUBLIC_BASE_URL],
      ['MINI_APP_URL', parsed.data.MINI_APP_URL]
    ]) {
      if (!value.startsWith('https://')) {
        throw new Error(`Invalid environment configuration: ${name} must use HTTPS in production`);
      }
    }
  }

  return {
    ...parsed.data,
    managerIds,
    hasPublicBaseUrl: Boolean(configuredPublicUrl),
    webhookPath: '/v1/telegram-webhook'
  };
}

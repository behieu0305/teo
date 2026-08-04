import 'dotenv/config';
import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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
  // An initData string stays replayable for its whole lifetime, so keep the
  // window short enough that a leaked one cannot be used to place orders.
  INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().max(3600).default(600)
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

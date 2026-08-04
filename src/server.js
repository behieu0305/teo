import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { MongoOrderRepository } from './repositories/mongo-order-repository.js';
import { createTelegramBot } from './telegram/create-bot.js';
import { configureTelegramWebhook } from './telegram/configure-webhook.js';
import { logger } from './utils/logger.js';

// Railway's drainingSeconds is 15, so the hard exit has to come after that or
// the process kills in-flight requests the platform is still draining.
const SHUTDOWN_TIMEOUT_MS = 20_000;
// After this many consecutive failures the database is not "starting up" any
// more, it is misconfigured. Escalate loudly instead of retrying in silence.
const CONNECT_ATTEMPTS_BEFORE_ALERT = 5;

const config = loadConfig();
let shuttingDown = false;
let webhookConfigured = false;
let databaseDegraded = false;
let everConnected = false;

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

const orderRepository = new MongoOrderRepository();
const bot = createTelegramBot({
  token: config.TELEGRAM_BOT_TOKEN,
  managerIds: config.managerIds,
  miniAppUrl: config.MINI_APP_URL,
  hasPublicBaseUrl: config.hasPublicBaseUrl,
  orderRepository
});

const app = createApp({
  orderRepository,
  bot,
  config,
  isDatabaseReady
});

// Start HTTP immediately so Railway can reach /health while MongoDB initializes.
const server = app.listen(config.PORT, '0.0.0.0', () => {
  logger.info('server_listening', { port: config.PORT, env: config.NODE_ENV });
});

async function configureWebhookOnce() {
  if (webhookConfigured || !config.AUTO_SET_WEBHOOK) return;

  if (!config.hasPublicBaseUrl) {
    logger.warn('webhook_setup_skipped', {
      reason: 'Generate a Railway public domain and redeploy the service.'
    });
    return;
  }

  await configureTelegramWebhook({ bot, config });
  webhookConfigured = true;
}

// Registered as soon as the HTTP server is up, NOT after MongoDB connects.
// The bot only needs the database to persist orders; /start, the Mini App button
// and webhook delivery have to keep working while MONGODB_URI is still wrong or
// the database is still booting. Chaining the two meant a bad URI left the bot
// completely silent while /health kept returning 200 and Railway stayed green.
configureWebhookOnce().catch((error) => {
  logger.error('webhook_auto_configure_failed', { error: error.message });
});

async function connectMongoUntilReady(uri) {
  let attempt = 0;

  while (!shuttingDown && !isDatabaseReady()) {
    attempt += 1;

    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000
      });
      logger.info('mongodb_connected', { attempts: attempt });
      databaseDegraded = false;
      everConnected = true;
      return;
    } catch (error) {
      const delayMs = Math.min(30_000, 2_000 * attempt);

      if (attempt >= CONNECT_ATTEMPTS_BEFORE_ALERT && !databaseDegraded) {
        databaseDegraded = true;
        // /health stays 200 on purpose so Railway keeps the service up, but
        // without this the deploy looks healthy forever while taking no orders.
        logger.error('mongodb_unreachable', {
          attempts: attempt,
          error: error.message,
          hint: 'Check that MONGODB_URI references ${{MongoDB.MONGO_URL}} and that both services share a project/environment. Orders return 503 until this is fixed.'
        });
      } else {
        logger.warn('mongodb_connect_failed', { attempt, error: error.message });
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  // A failed initial connect also emits this event. Reporting those as
  // disconnections doubled every retry line and buried the real signal.
  if (!shuttingDown && everConnected) {
    logger.error('mongodb_disconnected', { note: 'waiting for driver reconnection' });
  }
});

connectMongoUntilReady(config.MONGODB_URI).catch((error) => {
  logger.error('mongodb_startup_error', { error: error.message, stack: error.stack });
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('shutdown_started', { signal });

  server.close(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      logger.info('shutdown_complete', { signal });
      process.exit(0);
    }
  });

  setTimeout(() => {
    logger.error('shutdown_forced', { signal, timeoutMs: SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

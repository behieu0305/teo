import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config/env.js';
import { MongoOrderRepository } from './repositories/mongo-order-repository.js';
import { createTelegramBot } from './telegram/create-bot.js';
import { configureTelegramWebhook } from './telegram/configure-webhook.js';

const config = loadConfig();
let shuttingDown = false;
let webhookConfigured = false;

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

const orderRepository = new MongoOrderRepository();
const bot = createTelegramBot({
  token: config.TELEGRAM_BOT_TOKEN,
  managerIds: config.managerIds,
  miniAppUrl: config.MINI_APP_URL,
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
  console.log(`Server listening on 0.0.0.0:${config.PORT}`);
});

async function configureWebhookOnce() {
  if (webhookConfigured || !config.AUTO_SET_WEBHOOK) return;

  if (!config.hasPublicBaseUrl) {
    console.warn('Webhook setup skipped: generate a Railway public domain and redeploy the service.');
    return;
  }

  await configureTelegramWebhook({ bot, config });
  webhookConfigured = true;
}

async function connectMongoUntilReady(uri) {
  let attempt = 0;

  while (!shuttingDown && !isDatabaseReady()) {
    attempt += 1;

    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10_000,
        connectTimeoutMS: 10_000
      });
      console.log('MongoDB connected');

      try {
        await configureWebhookOnce();
      } catch (error) {
        console.error('Telegram webhook could not be configured automatically:', error.message);
      }

      return;
    } catch (error) {
      const delayMs = Math.min(30_000, 2_000 * attempt);
      console.error(`MongoDB connection attempt ${attempt} failed:`, error.message);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  if (!shuttingDown) {
    console.error('MongoDB disconnected; waiting for driver reconnection.');
  }
});

connectMongoUntilReady(config.MONGODB_URI).catch((error) => {
  console.error('Unexpected MongoDB startup error:', error);
});

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received. Shutting down...`);

  server.close(async () => {
    try {
      await mongoose.disconnect();
    } finally {
      process.exit(0);
    }
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

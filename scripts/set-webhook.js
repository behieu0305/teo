import { Telegraf } from 'telegraf';
import { loadConfig } from '../src/config/env.js';
import { configureTelegramWebhook } from '../src/telegram/configure-webhook.js';

const config = loadConfig();
const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
await configureTelegramWebhook({ bot, config });

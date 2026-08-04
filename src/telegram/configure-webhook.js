import { logger } from '../utils/logger.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function configureTelegramWebhook({ bot, config, attempts = 6 }) {
  const webhookUrl = new URL(config.webhookPath, config.PUBLIC_BASE_URL).toString();
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await bot.telegram.setWebhook(webhookUrl, {
        drop_pending_updates: false,
        allowed_updates: ['message', 'callback_query'],
        secret_token: config.TELEGRAM_WEBHOOK_SECRET
      });

      const info = await bot.telegram.getWebhookInfo();
      if (info.url !== webhookUrl) {
        throw new Error(`Telegram returned an unexpected webhook URL: ${info.url || '(empty)'}`);
      }

      logger.info('webhook_ready', { webhookUrl });
      return info;
    } catch (error) {
      lastError = error;
      const delayMs = Math.min(30_000, 1_500 * 2 ** (attempt - 1));
      logger.warn('webhook_setup_failed', { attempt, attempts, error: error.message });
      if (attempt < attempts) await sleep(delayMs);
    }
  }

  throw lastError;
}

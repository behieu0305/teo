import { Router } from 'express';
import { ZodError } from 'zod';
import { buildOrder, createOrderSchema } from '../domain/order.js';
import { formatOrderForManager, managerKeyboard } from '../services/order-message.js';
import { verifyTelegramInitData } from '../utils/telegram-init-data.js';

export function createOrderRouter({ orderRepository, bot, config, isDatabaseReady = () => true }) {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      if (!config.ORDERS_ENABLED) {
        return res.status(503).json({ error: 'Quán chưa mở nhận đơn trực tuyến.' });
      }

      if (!isDatabaseReady()) {
        return res.status(503).json({ error: 'Hệ thống đang kết nối cơ sở dữ liệu. Vui lòng thử lại sau.' });
      }
      const payload = createOrderSchema.parse(req.body);
      const initData = req.get('x-telegram-init-data');

      let telegramUser;
      if (initData) {
        telegramUser = verifyTelegramInitData(initData, config.TELEGRAM_BOT_TOKEN);
      } else if (config.ALLOW_DEV_TELEGRAM_BYPASS && config.NODE_ENV !== 'production') {
        if (!payload.devTelegramUser) {
          return res.status(401).json({ error: 'Missing Telegram authentication' });
        }
        telegramUser = payload.devTelegramUser;
      } else {
        return res.status(401).json({ error: 'Missing Telegram authentication' });
      }

      const order = buildOrder({ payload, telegramUser });
      const created = await orderRepository.create(order);

      const notificationResults = await Promise.allSettled(
        config.managerIds.map((managerId) =>
          bot.telegram.sendMessage(managerId, formatOrderForManager(created), {
            parse_mode: 'HTML',
            ...managerKeyboard(created)
          })
        )
      );

      const deliveredCount = notificationResults.filter(
        (result) => result.status === 'fulfilled'
      ).length;

      if (deliveredCount === 0) {
        console.error('Order saved but manager notification failed', {
          orderId: created.id,
          errors: notificationResults.map((result) =>
            result.status === 'rejected' ? result.reason?.message : null
          )
        });
      }

      return res.status(201).json({
        orderId: created.id,
        status: created.status,
        total: created.total,
        managerNotification: deliveredCount > 0 ? 'DELIVERED' : 'FAILED'
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid order payload',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        });
      }

      if (
        error.message?.startsWith('Menu item is unavailable') ||
        error.message?.startsWith('Quantity is too large')
      ) {
        return res.status(400).json({ error: error.message });
      }

      if (error.message?.includes('Telegram')) {
        return res.status(401).json({ error: error.message });
      }

      next(error);
    }
  });

  return router;
}

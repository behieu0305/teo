import { Router } from 'express';
import { ZodError } from 'zod';
import { buildOrder, createOrderSchema } from '../domain/order.js';
import { formatOrderForManager, managerKeyboard } from '../services/order-message.js';
import { verifyTelegramInitData } from '../utils/telegram-init-data.js';
import { logger } from '../utils/logger.js';

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

// A replay must report the fan-out that actually happened. Hardcoding
// 'DELIVERED' told the customer the shop had been notified even when every
// sendMessage had failed, which is the one case where they needed to phone in.
// `null` means the original request has not finished its fan-out yet — that is
// only reachable on the concurrent-submit path, so it is 'PENDING', not a lie
// in either direction.
function replayResponse(order) {
  return {
    orderId: order.id,
    status: order.status,
    total: order.total,
    managerNotification: order.managerNotification ?? 'PENDING',
    replayed: true
  };
}

export function createOrderRouter({ orderRepository, bot, config, isDatabaseReady = () => true }) {
  const router = Router();

  // Resolves the caller to a Telegram user, or reports why it could not.
  function authenticate(req, payload) {
    const initData = req.get('x-telegram-init-data');

    if (initData) {
      return {
        user: verifyTelegramInitData(initData, config.TELEGRAM_BOT_TOKEN, {
          maxAgeSeconds: config.INIT_DATA_MAX_AGE_SECONDS
        })
      };
    }

    if (config.ALLOW_DEV_TELEGRAM_BYPASS && config.NODE_ENV !== 'production') {
      if (!payload?.devTelegramUser) {
        return { error: 'Thiếu thông tin xác thực Telegram.' };
      }
      return { user: payload.devTelegramUser };
    }

    return { error: 'Vui lòng mở ứng dụng từ Telegram để đặt món.' };
  }

  router.post('/', async (req, res, next) => {
    try {
      if (!config.ORDERS_ENABLED) {
        return res.status(503).json({ error: 'Quán chưa mở nhận đơn trực tuyến.' });
      }

      if (!isDatabaseReady()) {
        return res
          .status(503)
          .json({ error: 'Hệ thống đang kết nối cơ sở dữ liệu. Vui lòng thử lại sau.' });
      }

      const payload = createOrderSchema.parse(req.body);

      const auth = authenticate(req, payload);
      if (auth.error) return res.status(401).json({ error: auth.error });
      const telegramUser = auth.user;

      const idempotencyKey = req.get('idempotency-key')?.trim() || null;
      if (idempotencyKey && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
        return res.status(400).json({ error: 'Idempotency-Key không hợp lệ.' });
      }

      // A retried submit (flaky mobile network, double tap) must not become a
      // second order, so a known key returns the original result verbatim.
      if (idempotencyKey) {
        const existing = await orderRepository.findByIdempotencyKey(idempotencyKey);
        if (existing) {
          if (existing.telegramUserId !== telegramUser.id) {
            return res.status(409).json({ error: 'Idempotency-Key đã được dùng cho đơn khác.' });
          }
          logger.info('order_idempotent_replay', { requestId: req.id, orderId: existing.id });
          return res.status(200).json(replayResponse(existing));
        }
      }

      const order = buildOrder({ payload, telegramUser, idempotencyKey });

      let created;
      try {
        created = await orderRepository.create(order);
      } catch (error) {
        // Two concurrent submits with the same key: the unique index rejects
        // the loser, so return the winner instead of a 500.
        if (error?.code === 11000 && idempotencyKey) {
          const winner = await orderRepository.findByIdempotencyKey(idempotencyKey);
          if (winner) {
            // Same ownership check as the fast replay path above. Without it,
            // guessing another customer's key loses the race on purpose and
            // reads back their order id, status and total through the 500-
            // avoidance branch — the check on the read path is bypassed.
            if (winner.telegramUserId !== telegramUser.id) {
              return res.status(409).json({ error: 'Idempotency-Key đã được dùng cho đơn khác.' });
            }
            logger.info('order_idempotent_replay', { requestId: req.id, orderId: winner.id });
            return res.status(200).json(replayResponse(winner));
          }
        }
        throw error;
      }

      const notificationResults = await Promise.allSettled(
        config.managerIds.map((managerId) =>
          bot.telegram.sendMessage(managerId, formatOrderForManager(created), {
            parse_mode: 'HTML',
            ...managerKeyboard(created)
          })
        )
      );

      // Keep the chat id next to the message id: a status change later has to
      // edit every manager's copy, and Telegram needs both to address an edit.
      const managerMessages = notificationResults.flatMap((result, index) =>
        result.status === 'fulfilled' && Number.isInteger(result.value?.message_id)
          ? [{ chatId: config.managerIds[index], messageId: result.value.message_id }]
          : []
      );

      const deliveredCount = notificationResults.filter(
        (result) => result.status === 'fulfilled'
      ).length;
      const managerNotification = deliveredCount > 0 ? 'DELIVERED' : 'FAILED';

      try {
        await orderRepository.recordManagerNotification(created.id, {
          managerMessages,
          managerNotification
        });
      } catch (error) {
        // The order is already saved; losing the message refs only costs us the
        // fan-out edit later, so it must not turn an accepted order into a 500.
        logger.warn('order_manager_messages_not_recorded', {
          requestId: req.id,
          orderId: created.id,
          error: error.message
        });
      }

      if (deliveredCount === 0) {
        logger.error('order_manager_notification_failed', {
          requestId: req.id,
          orderId: created.id,
          errors: notificationResults
            .filter((result) => result.status === 'rejected')
            .map((result) => result.reason?.message)
        });
      } else {
        logger.info('order_created', {
          requestId: req.id,
          orderId: created.id,
          total: created.total,
          notifiedManagers: deliveredCount
        });
      }

      return res.status(201).json({
        orderId: created.id,
        status: created.status,
        total: created.total,
        managerNotification
      });
    } catch (error) {
      return handleOrderError(error, res, next);
    }
  });

  // Lets a customer follow their own order once the Telegram message scrolls away.
  router.get('/:id', async (req, res, next) => {
    try {
      if (!isDatabaseReady()) {
        return res
          .status(503)
          .json({ error: 'Hệ thống đang kết nối cơ sở dữ liệu. Vui lòng thử lại sau.' });
      }

      const auth = authenticate(req, req.body);
      if (auth.error) return res.status(401).json({ error: auth.error });

      const order = await orderRepository.findById(req.params.id);
      // Managers may read any order, everyone else only their own. Answering
      // 404 rather than 403 keeps order ids from being probed for existence.
      const isManager = config.managerIds.includes(auth.user.id);
      if (!order || (!isManager && order.telegramUserId !== auth.user.id)) {
        return res.status(404).json({ error: 'Không tìm thấy đơn hàng.' });
      }

      return res.json({
        orderId: order.id,
        status: order.status,
        total: order.total,
        items: order.items,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      });
    } catch (error) {
      return handleOrderError(error, res, next);
    }
  });

  return router;
}

function handleOrderError(error, res, next) {
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

  // initData is minted once when the Mini App opens and never refreshes, so an
  // expiry is not "invalid credentials" — it just means the app has been open a
  // while. The customer can only fix it by reopening the app, so say which of
  // the two it is and give the client a code it can act on.
  if (error.message === 'Expired Telegram initData') {
    return res.status(401).json({
      code: 'INIT_DATA_EXPIRED',
      error: 'Phiên Telegram đã hết hạn. Vui lòng đóng và mở lại ứng dụng từ Telegram rồi gửi đơn.'
    });
  }

  if (error.message?.includes('Telegram')) {
    return res.status(401).json({ error: 'Phiên Telegram không hợp lệ hoặc đã hết hạn.' });
  }

  return next(error);
}

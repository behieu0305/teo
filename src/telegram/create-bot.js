import { Markup, Telegraf } from 'telegraf';
import { ORDER_STATUS, statusLabel } from '../domain/order-status.js';
import { formatOrderForManager, managerKeyboard } from '../services/order-message.js';
import { logger } from '../utils/logger.js';

const actionToStatus = Object.freeze({
  confirm: ORDER_STATUS.PREPARING,
  shipping: ORDER_STATUS.SHIPPING,
  complete: ORDER_STATUS.COMPLETED,
  cancel: ORDER_STATUS.CANCELED
});

const customerMessages = Object.freeze({
  [ORDER_STATUS.PREPARING]: 'Đơn hàng của bạn đã được quán xác nhận và đang chuẩn bị. 👨‍🍳',
  [ORDER_STATUS.SHIPPING]: 'Đơn hàng của bạn đang được giao. 🛵',
  [ORDER_STATUS.COMPLETED]: 'Đơn hàng đã hoàn thành ☑️. Cảm ơn bạn đã đặt món! 💓',
  [ORDER_STATUS.CANCELED]: 'Đơn hàng đã bị hủy ❌. Vui lòng liên hệ quán nếu cần hỗ trợ.'
});

export function createTelegramBot({
  token,
  managerIds,
  miniAppUrl,
  orderRepository,
  hasPublicBaseUrl = true
}) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    // Telegram rejects a web_app button whose URL is not a real HTTPS domain,
    // which would make /start fail for everyone before the domain is generated.
    if (!hasPublicBaseUrl) {
      logger.warn('start_without_public_domain', { miniAppUrl });
      await ctx.reply(
        'Quán đang hoàn tất cài đặt hệ thống đặt món. Vui lòng thử lại sau ít phút.'
      );
      return;
    }

    await ctx.reply(
      'Xin chào! Nhấn nút bên dưới để xem menu và đặt món.',
      Markup.inlineKeyboard([[Markup.button.webApp('🍽️ Mở menu đặt món', miniAppUrl)]])
    );
  });

  bot.action(/^order:(confirm|shipping|complete|cancel):([a-f0-9-]+)$/i, async (ctx) => {
    const [, action, orderId] = ctx.match;

    if (!managerIds.includes(ctx.from.id)) {
      await ctx.answerCbQuery('Bạn không có quyền thao tác đơn hàng này.', { show_alert: true });
      return;
    }

    const nextStatus = actionToStatus[action];

    let updated;
    try {
      updated = await orderRepository.updateStatus(orderId, nextStatus);
    } catch (error) {
      if (error.code === 'INVALID_TRANSITION') {
        await ctx.answerCbQuery(
          `Đơn đang ở trạng thái "${statusLabel(error.from)}" nên không thể chuyển sang "${statusLabel(error.to)}".`,
          { show_alert: true }
        );
        return;
      }

      logger.error('order_status_update_failed', { orderId, nextStatus, error: error.message });
      await ctx.answerCbQuery('Không thể cập nhật đơn. Vui lòng thử lại.', { show_alert: true });
      return;
    }

    if (!updated) {
      await ctx.answerCbQuery('Không tìm thấy đơn hàng.', { show_alert: true });
      return;
    }

    // The status change already succeeded. Everything below is best effort, so
    // each step is isolated: a customer who blocked the bot must not make the
    // manager see a failure for an update that actually went through.
    await ctx.answerCbQuery(`Đã chuyển sang: ${statusLabel(updated.status)}`);

    try {
      await ctx.editMessageText(formatOrderForManager(updated), {
        parse_mode: 'HTML',
        ...managerKeyboard(updated)
      });
    } catch (error) {
      logger.warn('manager_message_edit_failed', { orderId, error: error.message });
    }

    try {
      await ctx.telegram.sendMessage(updated.telegramUserId, customerMessages[updated.status]);
    } catch (error) {
      logger.warn('customer_notification_failed', {
        orderId,
        telegramUserId: updated.telegramUserId,
        error: error.message
      });
    }
  });

  bot.catch((error) => {
    logger.error('telegram_bot_error', { error: error.message, stack: error.stack });
  });

  return bot;
}

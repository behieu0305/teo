import { Markup, Telegraf } from 'telegraf';
import { ORDER_STATUS, statusLabel } from '../domain/order-status.js';
import { formatOrderForManager, managerKeyboard } from '../services/order-message.js';

const actionToStatus = Object.freeze({
  confirm: ORDER_STATUS.PREPARING,
  shipping: ORDER_STATUS.SHIPPING,
  complete: ORDER_STATUS.COMPLETED,
  cancel: ORDER_STATUS.CANCELED
});

const customerMessages = Object.freeze({
  [ORDER_STATUS.PREPARING]: 'Đơn hàng của bạn đã được quán xác nhận và đang chuẩn bị.',
  [ORDER_STATUS.SHIPPING]: 'Đơn hàng của bạn đang được giao.',
  [ORDER_STATUS.COMPLETED]: 'Đơn hàng đã hoàn thành. Cảm ơn bạn đã đặt món!',
  [ORDER_STATUS.CANCELED]: 'Đơn hàng đã bị hủy. Vui lòng liên hệ quán nếu cần hỗ trợ.'
});

export function createTelegramBot({ token, managerIds, miniAppUrl, orderRepository }) {
  const bot = new Telegraf(token);

  bot.start(async (ctx) => {
    await ctx.reply(
      'Xin chào! Nhấn nút bên dưới để xem menu và đặt món.',
      Markup.inlineKeyboard([
        [Markup.button.webApp('🍽️ Mở menu đặt món', miniAppUrl)]
      ])
    );
  });

  bot.action(/^order:(confirm|shipping|complete|cancel):([a-f0-9-]+)$/i, async (ctx) => {
    const [, action, orderId] = ctx.match;

    if (!managerIds.includes(ctx.from.id)) {
      await ctx.answerCbQuery('Bạn không có quyền thao tác đơn hàng này.', { show_alert: true });
      return;
    }

    const nextStatus = actionToStatus[action];

    try {
      const updated = await orderRepository.updateStatus(orderId, nextStatus);
      if (!updated) {
        await ctx.answerCbQuery('Không tìm thấy đơn hàng.', { show_alert: true });
        return;
      }

      await ctx.answerCbQuery(`Đã chuyển sang: ${statusLabel(updated.status)}`);
      await ctx.editMessageText(formatOrderForManager(updated), {
        parse_mode: 'HTML',
        ...managerKeyboard(updated)
      });

      await ctx.telegram.sendMessage(
        updated.telegramUserId,
        customerMessages[updated.status]
      );
    } catch (error) {
      await ctx.answerCbQuery(error.message || 'Không thể cập nhật đơn.', { show_alert: true });
    }
  });

  bot.catch((error) => {
    console.error('Telegram bot error:', error);
  });

  return bot;
}

import { Markup } from 'telegraf';
import { statusLabel, ORDER_STATUS } from '../domain/order-status.js';

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0
});

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatOrderForManager(order) {
  const itemLines = order.items
    .map(
      (item) =>
        `• ${escapeHtml(item.name)} × ${item.quantity}: <b>${money.format(item.lineTotal)}</b>`
    )
    .join('\n');

  const username = order.telegramUsername
    ? `@${escapeHtml(order.telegramUsername)}`
    : 'Không có username';

  return [
    `<b>ĐƠN HÀNG MỚI</b>`,
    `Mã: <code>${escapeHtml(order.id)}</code>`,
    `Trạng thái: <b>${statusLabel(order.status)}</b>`,
    '',
    `<b>Khách hàng</b>`,
    `Tên Telegram: ${escapeHtml(order.telegramDisplayName)}`,
    `Username: ${username}`,
    `Telegram ID: <code>${order.telegramUserId}</code>`,
    `SĐT: ${escapeHtml(order.customer.phone)}`,
    `Địa chỉ: ${escapeHtml(order.customer.address)}`,
    order.customer.note ? `Ghi chú: ${escapeHtml(order.customer.note)}` : '',
    '',
    `<b>Món đã đặt</b>`,
    itemLines,
    '',
    `<b>Tổng cộng: ${money.format(order.total)}</b>`
  ]
    .filter((line) => line !== '')
    .join('\n');
}

export function managerKeyboard(order) {
  if (order.status === ORDER_STATUS.PENDING) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('✅ Xác nhận', `order:confirm:${order.id}`)],
      [Markup.button.callback('❌ Hủy đơn', `order:cancel:${order.id}`)]
    ]);
  }

  if (order.status === ORDER_STATUS.PREPARING) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🛵 Bắt đầu giao', `order:shipping:${order.id}`)],
      [Markup.button.callback('❌ Hủy đơn', `order:cancel:${order.id}`)]
    ]);
  }

  if (order.status === ORDER_STATUS.SHIPPING) {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🏁 Hoàn thành', `order:complete:${order.id}`)]
    ]);
  }

  return Markup.inlineKeyboard([]);
}

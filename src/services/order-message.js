import { Markup } from 'telegraf';
import {
  statusHeadline,
  statusIcon,
  statusLabel,
  ORDER_STATUS
} from '../domain/order-status.js';

const number = new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 });
const money = { format: (value) => `Rs ${number.format(value)}` };

// Railway containers run on UTC. Without an explicit zone the manager would read
// every order stamped 5h30m earlier than the customer actually placed it.
const SHOP_TIMEZONE = 'Asia/Colombo';

const orderTime = new Intl.DateTimeFormat('vi-VN', {
  timeZone: SHOP_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour12: false
});

// Telegram only ships keycap emoji up to 10; an order may contain up to 30 lines
// (see createOrderSchema), so anything past that falls back to plain numbering.
const KEYCAPS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

function itemMarker(index) {
  return KEYCAPS[index] ?? `${index + 1}.`;
}

function formatOrderTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : orderTime.format(date);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function formatOrderForManager(order) {
  const itemLines = order.items
    .map((item, index) => {
      // Unit price alone forces the manager to multiply in their head, so the
      // line total is spelled out whenever the quantity is more than one.
      const priceLine =
        item.quantity > 1
          ? `   Đơn giá: ${money.format(item.unitPrice)} → Thành tiền: <b>${money.format(item.lineTotal)}</b>`
          : `   Đơn giá: <b>${money.format(item.unitPrice)}</b>`;

      return `${itemMarker(index)} ${escapeHtml(item.name)} × ${item.quantity}\n${priceLine}`;
    })
    .join('\n');

  const username = order.telegramUsername
    ? `@${escapeHtml(order.telegramUsername)}`
    : 'Không có username';

  const placedAt = formatOrderTime(order.createdAt);

  return [
    `${statusIcon(order.status)} <b>${statusHeadline(order.status)}</b>`,
    `🔖 Mã: <code>${escapeHtml(order.id)}</code>`,
    placedAt ? `⏱ Thời gian đặt: ${placedAt}` : null,
    `♻️ Trạng thái: <b>${statusLabel(order.status)}</b>`,
    '',
    `👤 <b>KHÁCH HÀNG</b>`,
    `Tên Telegram: ${escapeHtml(order.telegramDisplayName)}`,
    `Username: ${username}`,
    `Telegram ID: <code>${order.telegramUserId}</code>`,
    `📞 SĐT: ${escapeHtml(order.customer.phone)}`,
    `🗳 Địa chỉ: ${escapeHtml(order.customer.address)}`,
    order.customer.note ? `📝 Ghi chú: ${escapeHtml(order.customer.note)}` : null,
    '',
    `🍽 <b>DANH SÁCH MÓN</b>`,
    itemLines,
    '',
    `💰 <b>TỔNG CỘNG: ${money.format(order.total)}</b>`
  ]
    // Only drop the optional lines. Filtering on '' would also strip the blank
    // separators above and collapse the message into one unreadable block.
    .filter((line) => line !== null)
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

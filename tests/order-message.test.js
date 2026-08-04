import { describe, expect, it } from 'vitest';
import { formatOrderForManager } from '../src/services/order-message.js';
import { ORDER_STATUS } from '../src/domain/order-status.js';

function buildOrder(overrides = {}) {
  return {
    id: '1fe33441-e317-47f9-850e-5b103a49d1d4',
    telegramUserId: 7283367810,
    telegramUsername: 'teobanker',
    telegramDisplayName: 'Tèo',
    // 16:38 UTC is 22:08 in Colombo (UTC+05:30).
    createdAt: new Date('2026-07-20T16:38:00Z'),
    status: ORDER_STATUS.PENDING,
    customer: { phone: '0771234567', address: '12 Đường Mới', note: '' },
    items: [
      { menuItemId: 'bo-kho', name: 'Bò kho', unitPrice: 3000, quantity: 1, lineTotal: 3000 }
    ],
    total: 3000,
    ...overrides
  };
}

describe('formatOrderForManager', () => {
  // The manager's message is edited in place, so a stale headline would leave a
  // finished order still shouting "ĐƠN HÀNG MỚI" in the chat.
  it.each([
    [ORDER_STATUS.PENDING, '🔔 <b>ĐƠN HÀNG MỚI</b>'],
    [ORDER_STATUS.PREPARING, '👨‍🍳 <b>ĐƠN ĐANG CHUẨN BỊ</b>'],
    [ORDER_STATUS.SHIPPING, '🛵 <b>ĐƠN ĐANG GIAO</b>'],
    [ORDER_STATUS.COMPLETED, '✅ <b>ĐƠN ĐÃ HOÀN THÀNH</b>'],
    [ORDER_STATUS.CANCELED, '❌ <b>ĐƠN ĐÃ HỦY</b>']
  ])('headlines a %s order with its own icon and title', (status, expected) => {
    const message = formatOrderForManager(buildOrder({ status }));

    expect(message.startsWith(expected)).toBe(true);
    if (status !== ORDER_STATUS.PENDING) {
      expect(message).not.toContain('ĐƠN HÀNG MỚI');
    }
  });

  it('stamps the order time in the shop timezone, not the container UTC clock', () => {
    const message = formatOrderForManager(buildOrder());

    // Railway runs UTC. Printing the raw clock would show 16:38 and every order
    // would look 5h30m older than it is.
    expect(message).toContain('⏱ Thời gian đặt: 22:08 20/07/2026');
    expect(message).not.toContain('16:38');
  });

  it('omits the time line when the order has no createdAt', () => {
    const message = formatOrderForManager(buildOrder({ createdAt: undefined }));

    expect(message).not.toContain('Thời gian đặt');
    expect(message).toContain('🔖 Mã:');
  });

  it('spells out the line total when a dish is ordered more than once', () => {
    const message = formatOrderForManager(
      buildOrder({
        items: [
          { menuItemId: 'bo-kho', name: 'Bò kho', unitPrice: 3000, quantity: 3, lineTotal: 9000 }
        ],
        total: 9000
      })
    );

    // Unit price alone would force the manager to multiply mentally.
    expect(message).toContain('1️⃣ Bò kho × 3');
    expect(message).toContain('Đơn giá: Rs 3,000 → Thành tiền: <b>Rs 9,000</b>');
  });

  it('shows the unit price alone for a single portion', () => {
    const message = formatOrderForManager(buildOrder());

    expect(message).toContain('1️⃣ Bò kho × 1');
    expect(message).not.toContain('Thành tiền');
  });

  it('numbers dishes with keycaps up to ten, then plain numbers', () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      menuItemId: `dish-${index}`,
      name: `Món ${index + 1}`,
      unitPrice: 1000,
      quantity: 1,
      lineTotal: 1000
    }));
    const message = formatOrderForManager(buildOrder({ items, total: 12_000 }));

    // createOrderSchema allows up to 30 lines but Telegram keycaps stop at 10.
    expect(message).toContain('🔟 Món 10');
    expect(message).toContain('11. Món 11');
    expect(message).toContain('12. Món 12');
  });

  it('keeps the blank separators that make the message readable', () => {
    const message = formatOrderForManager(buildOrder());
    expect(message).toContain('\n\n👤 <b>KHÁCH HÀNG</b>');
    expect(message).toContain('\n\n🍽 <b>DANH SÁCH MÓN</b>');
  });

  it('drops the note line when the customer left none', () => {
    expect(formatOrderForManager(buildOrder())).not.toContain('📝 Ghi chú');
    expect(
      formatOrderForManager(buildOrder({ customer: { phone: '077', address: 'x', note: 'Ít cay' } }))
    ).toContain('📝 Ghi chú: Ít cay');
  });

  it('still escapes HTML in customer-controlled text', () => {
    const message = formatOrderForManager(
      buildOrder({
        telegramDisplayName: '<b>hack</b>',
        customer: { phone: '077', address: '12 & 13 <script>', note: '' }
      })
    );

    expect(message).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(message).toContain('12 &amp; 13 &lt;script&gt;');
    expect(message).not.toContain('<script>');
  });
});

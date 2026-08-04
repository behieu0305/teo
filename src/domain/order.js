import crypto from 'node:crypto';
import { z } from 'zod';
import { getMenuItem } from './menu.js';
import { ORDER_STATUS } from './order-status.js';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().min(1).max(80),
        quantity: z.number().int().min(1).max(20)
      })
    )
    .min(1)
    .max(30),
  customer: z.object({
    phone: z
      .string()
      .trim()
      .min(8)
      .max(20)
      .regex(/^[0-9+()\s.-]+$/)
      .refine((value) => {
        const digitCount = value.replace(/\D/g, '').length;
        return digitCount >= 8 && digitCount <= 15;
      }, 'Phone number must contain 8 to 15 digits'),
    address: z.string().trim().min(5).max(300),
    note: z.string().trim().max(500).optional().default('')
  }),
  devTelegramUser: z
    .object({
      id: z.number().int().positive(),
      username: z.string().trim().max(64).optional(),
      first_name: z.string().trim().max(64).optional()
    })
    .optional()
});

export function buildOrder({ payload, telegramUser, idempotencyKey = null, now = new Date() }) {
  const grouped = new Map();
  for (const item of payload.items) {
    grouped.set(item.menuItemId, (grouped.get(item.menuItemId) ?? 0) + item.quantity);
  }

  const items = [...grouped.entries()].map(([menuItemId, quantity]) => {
    const menuItem = getMenuItem(menuItemId);
    if (!menuItem || !menuItem.available) {
      throw new Error(`Menu item is unavailable: ${menuItemId}`);
    }
    if (quantity > 20) throw new Error(`Quantity is too large: ${menuItemId}`);

    return {
      menuItemId,
      name: menuItem.name,
      unitPrice: menuItem.price,
      quantity,
      lineTotal: menuItem.price * quantity
    };
  });

  const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

  return {
    id: crypto.randomUUID(),
    idempotencyKey,
    telegramUserId: telegramUser.id,
    telegramUsername: telegramUser.username ?? '',
    telegramDisplayName:
      [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(' ') ||
      telegramUser.username ||
      String(telegramUser.id),
    customer: payload.customer,
    items,
    total,
    status: ORDER_STATUS.PENDING,
    createdAt: now,
    updatedAt: now
  };
}

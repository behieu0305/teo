import { describe, expect, it } from 'vitest';
import { assertTransition, canTransition, ORDER_STATUS } from '../src/domain/order-status.js';

describe('order status transitions', () => {
  it('allows the normal fulfillment flow', () => {
    expect(canTransition(ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING)).toBe(true);
    expect(canTransition(ORDER_STATUS.PREPARING, ORDER_STATUS.SHIPPING)).toBe(true);
    expect(canTransition(ORDER_STATUS.SHIPPING, ORDER_STATUS.COMPLETED)).toBe(true);
  });

  it('allows cancellation before shipping', () => {
    expect(canTransition(ORDER_STATUS.PENDING, ORDER_STATUS.CANCELED)).toBe(true);
    expect(canTransition(ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELED)).toBe(true);
  });

  it('rejects reopening a completed order', () => {
    expect(() => assertTransition(ORDER_STATUS.COMPLETED, ORDER_STATUS.PREPARING)).toThrow(
      'Invalid order transition'
    );
  });
});

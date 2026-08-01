import { describe, expect, it } from 'vitest';
import { MemoryOrderRepository } from '../src/repositories/memory-order-repository.js';
import { ORDER_STATUS } from '../src/domain/order-status.js';
import { buildOrder } from '../src/domain/order.js';
import { formatOrderForManager } from '../src/services/order-message.js';

const payload = {
  items: [{ menuItemId: 'pho-bo', quantity: 1 }],
  customer: { phone: '0771234567', address: '123 Đường Mới', note: '' }
};
const telegramUser = { id: 999001, first_name: 'Khách', username: 'customer_test' };

async function seed(repository, overrides = {}) {
  return repository.create(buildOrder({ payload, telegramUser, ...overrides }));
}

describe('MemoryOrderRepository', () => {
  it('stores and reads an order back', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository);

    expect(created.status).toBe(ORDER_STATUS.PENDING);
    expect(await repository.findById(created.id)).toMatchObject({ id: created.id });
  });

  it('returns null for an unknown id', async () => {
    expect(await new MemoryOrderRepository().findById('nope')).toBeNull();
  });

  it('advances through the fulfillment flow', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository);

    expect((await repository.updateStatus(created.id, ORDER_STATUS.PREPARING)).status).toBe(
      ORDER_STATUS.PREPARING
    );
    expect((await repository.updateStatus(created.id, ORDER_STATUS.SHIPPING)).status).toBe(
      ORDER_STATUS.SHIPPING
    );
    expect((await repository.updateStatus(created.id, ORDER_STATUS.COMPLETED)).status).toBe(
      ORDER_STATUS.COMPLETED
    );
  });

  it('refuses an illegal transition with a typed error', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository);

    await expect(repository.updateStatus(created.id, ORDER_STATUS.COMPLETED)).rejects.toMatchObject(
      { code: 'INVALID_TRANSITION', from: ORDER_STATUS.PENDING, to: ORDER_STATUS.COMPLETED }
    );
  });

  it('rejects the second of two competing updates', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository);

    await repository.updateStatus(created.id, ORDER_STATUS.CANCELED);
    // A manager tapping "confirm" on a stale message must not revive the order.
    await expect(repository.updateStatus(created.id, ORDER_STATUS.PREPARING)).rejects.toMatchObject({
      code: 'INVALID_TRANSITION'
    });
  });

  it('returns null when updating an order that does not exist', async () => {
    expect(await new MemoryOrderRepository().updateStatus('nope', ORDER_STATUS.PREPARING)).toBeNull();
  });

  it('finds an order by its idempotency key', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository, { idempotencyKey: 'key-12345678' });

    expect((await repository.findByIdempotencyKey('key-12345678')).id).toBe(created.id);
    expect(await repository.findByIdempotencyKey('other-key-1')).toBeNull();
    expect(await repository.findByIdempotencyKey(null)).toBeNull();
  });

  it('owns createdAt and updatedAt the way the Mongo schema does', async () => {
    const repository = new MemoryOrderRepository();
    const ancient = new Date('2000-01-01T00:00:00Z');
    const created = await seed(repository, { now: ancient });

    // `timestamps: true` overwrites whatever the caller passed, so the memory
    // repository has to do the same or tests describe fictional behaviour.
    expect(created.createdAt.getTime()).toBeGreaterThan(ancient.getTime());
  });
});

describe('formatOrderForManager', () => {
  it('keeps the blank lines that separate each section', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository);

    const message = formatOrderForManager(created);

    // Filtering on '' used to strip the intentional separators too, collapsing
    // the message into one dense block on a phone screen.
    expect(message.split('\n').filter((line) => line === '').length).toBe(3);
  });

  it('omits the note line when there is no note', async () => {
    const repository = new MemoryOrderRepository();
    const created = await seed(repository);

    expect(formatOrderForManager(created)).not.toContain('Ghi chú');
  });

  it('includes the note when present', async () => {
    const repository = new MemoryOrderRepository();
    const created = await repository.create(
      buildOrder({
        payload: { ...payload, customer: { ...payload.customer, note: 'Ít cay' } },
        telegramUser
      })
    );

    expect(formatOrderForManager(created)).toContain('Ghi chú: Ít cay');
  });

  it('escapes HTML so a crafted name cannot break the message', async () => {
    const repository = new MemoryOrderRepository();
    const created = await repository.create(
      buildOrder({ payload, telegramUser: { id: 5, first_name: '<b>hack</b>' } })
    );

    const message = formatOrderForManager(created);

    expect(message).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(message).not.toContain('<b>hack</b>');
  });
});

describe('buildOrder', () => {
  it('merges duplicate lines for the same menu item', () => {
    const order = buildOrder({
      payload: {
        ...payload,
        items: [
          { menuItemId: 'pho-bo', quantity: 1 },
          { menuItemId: 'pho-bo', quantity: 2 }
        ]
      },
      telegramUser
    });

    expect(order.items).toHaveLength(1);
    expect(order.items[0].quantity).toBe(3);
    expect(order.total).toBe(9000);
  });

  it('rejects a merged quantity above the per-item cap', () => {
    expect(() =>
      buildOrder({
        payload: {
          ...payload,
          items: [
            { menuItemId: 'pho-bo', quantity: 15 },
            { menuItemId: 'pho-bo', quantity: 10 }
          ]
        },
        telegramUser
      })
    ).toThrow(/Quantity is too large/);
  });

  it('falls back through display name candidates', () => {
    expect(buildOrder({ payload, telegramUser: { id: 7 } }).telegramDisplayName).toBe('7');
    expect(
      buildOrder({ payload, telegramUser: { id: 7, username: 'nick' } }).telegramDisplayName
    ).toBe('nick');
  });
});

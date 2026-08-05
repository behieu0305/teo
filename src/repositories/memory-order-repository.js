import { InvalidTransitionError, previousStatesFor } from '../domain/order-status.js';

export class MemoryOrderRepository {
  #orders = new Map();

  async create(order) {
    // Mirror Mongo's `timestamps: true`, which owns these two fields, so tests
    // written against this repository describe real production behaviour.
    const now = new Date();
    const stored = {
      ...order,
      // Mongo omits a null idempotencyKey entirely so the sparse unique index
      // ignores key-less orders. Mirror that here or the two stores disagree.
      idempotencyKey: order.idempotencyKey || undefined,
      managerMessages: [],
      managerNotification: null,
      createdAt: now,
      updatedAt: now
    };
    // Mongo has a unique index on idempotencyKey and answers a collision with
    // E11000. Reproduce it, or every API test written against this repository
    // silently skips the duplicate-key branch that production really hits.
    if (stored.idempotencyKey !== undefined) {
      for (const existing of this.#orders.values()) {
        if (existing.idempotencyKey === stored.idempotencyKey) {
          const error = new Error(
            `E11000 duplicate key error collection: orders index: idempotencyKey_1 dup key: { idempotencyKey: "${stored.idempotencyKey}" }`
          );
          error.code = 11000;
          throw error;
        }
      }
    }

    this.#orders.set(stored.id, structuredClone(stored));
    return structuredClone(stored);
  }

  async findById(id) {
    const order = this.#orders.get(id);
    return order ? structuredClone(order) : null;
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    for (const order of this.#orders.values()) {
      if (order.idempotencyKey === idempotencyKey) return structuredClone(order);
    }
    return null;
  }

  async recordManagerNotification(id, { managerMessages, managerNotification }) {
    const order = this.#orders.get(id);
    if (!order) return null;
    order.managerMessages = structuredClone(managerMessages);
    order.managerNotification = managerNotification;
    return structuredClone(order);
  }

  async updateStatus(id, nextStatus) {
    const order = this.#orders.get(id);
    if (!order) return null;
    if (!previousStatesFor(nextStatus).includes(order.status)) {
      throw new InvalidTransitionError(order.status, nextStatus);
    }

    order.status = nextStatus;
    order.updatedAt = new Date();
    return structuredClone(order);
  }
}

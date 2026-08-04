import { InvalidTransitionError, previousStatesFor } from '../domain/order-status.js';

export class MemoryOrderRepository {
  #orders = new Map();

  async create(order) {
    // Mirror Mongo's `timestamps: true`, which owns these two fields, so tests
    // written against this repository describe real production behaviour.
    const now = new Date();
    const stored = { ...order, createdAt: now, updatedAt: now };
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

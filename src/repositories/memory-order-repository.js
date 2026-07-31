import { assertTransition } from '../domain/order-status.js';

export class MemoryOrderRepository {
  #orders = new Map();

  async create(order) {
    this.#orders.set(order.id, structuredClone(order));
    return structuredClone(order);
  }

  async findById(id) {
    const order = this.#orders.get(id);
    return order ? structuredClone(order) : null;
  }

  async updateStatus(id, nextStatus) {
    const order = this.#orders.get(id);
    if (!order) return null;
    assertTransition(order.status, nextStatus);
    order.status = nextStatus;
    order.updatedAt = new Date();
    this.#orders.set(id, order);
    return structuredClone(order);
  }
}

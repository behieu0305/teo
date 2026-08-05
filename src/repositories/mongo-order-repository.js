import mongoose from 'mongoose';
import { InvalidTransitionError, previousStatesFor } from '../domain/order-status.js';

const orderSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    // Set only when the client sends an Idempotency-Key. `sparse` keeps the
    // unique index from colliding across the many orders that have no key.
    idempotencyKey: { type: String, index: { unique: true, sparse: true } },
    telegramUserId: { type: Number, required: true, index: true },
    // One entry per manager message actually delivered for this order. A status
    // change has to edit every copy, not just the one the acting manager tapped.
    managerMessages: {
      type: [{ _id: false, chatId: Number, messageId: Number }],
      default: []
    },
    // 'DELIVERED' | 'FAILED', written once the fan-out settles. Persisted so an
    // idempotent replay can report what really happened instead of guessing.
    managerNotification: { type: String, default: null },
    telegramUsername: { type: String, default: '' },
    telegramDisplayName: { type: String, required: true },
    customer: {
      phone: { type: String, required: true },
      address: { type: String, required: true },
      note: { type: String, default: '' }
    },
    items: [
      {
        _id: false,
        menuItemId: String,
        name: String,
        unitPrice: Number,
        quantity: Number,
        lineTotal: Number
      }
    ],
    total: { type: Number, required: true },
    status: { type: String, required: true, index: true }
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ createdAt: -1 });

const OrderModel = mongoose.models.Order ?? mongoose.model('Order', orderSchema);

function normalize(document) {
  if (!document) return null;
  const object = document.toObject ? document.toObject() : document;
  const { _id, ...rest } = object;
  return { ...rest, id: _id };
}

export class MongoOrderRepository {
  async create(order) {
    const { id, createdAt, updatedAt, idempotencyKey, ...rest } = order;
    // `timestamps: true` owns createdAt/updatedAt, so drop the caller's values
    // here instead of passing values that mongoose will silently overwrite.
    const document = { ...rest, _id: id };

    // A sparse unique index skips *missing* fields — it does NOT skip fields
    // explicitly set to null; null is a value and gets indexed like any other.
    // buildOrder always emits idempotencyKey (null when the client sent no
    // header), so writing it through would let exactly one key-less order
    // exist: the second one dies on E11000, and the recovery branch in the
    // route is gated on `idempotencyKey` being truthy, so it rethrows as a 500.
    // Omitting the field is what actually makes `sparse` do its job.
    if (idempotencyKey) document.idempotencyKey = idempotencyKey;

    const created = await OrderModel.create(document);
    return normalize(created);
  }

  // Best effort: the order already exists, so a failure here must not fail the
  // request. Returning null lets the caller carry on with the in-memory copy.
  async recordManagerNotification(id, { managerMessages, managerNotification }) {
    const updated = await OrderModel.findByIdAndUpdate(
      id,
      { $set: { managerMessages, managerNotification } },
      { new: true }
    ).lean();
    return normalize(updated);
  }

  async findById(id) {
    return normalize(await OrderModel.findById(id).lean());
  }

  async findByIdempotencyKey(idempotencyKey) {
    if (!idempotencyKey) return null;
    return normalize(await OrderModel.findOne({ idempotencyKey }).lean());
  }

  async updateStatus(id, nextStatus) {
    // One conditional update: the status filter is the concurrency guard, so
    // two managers tapping at the same moment cannot both win.
    const updated = await OrderModel.findOneAndUpdate(
      { _id: id, status: { $in: previousStatesFor(nextStatus) } },
      { $set: { status: nextStatus } },
      { new: true }
    ).lean();

    if (updated) return normalize(updated);

    // Nothing matched: the order is either gone or no longer in a state that
    // allows this transition. Tell those two apart for the caller.
    const current = await OrderModel.findById(id).lean();
    if (!current) return null;
    throw new InvalidTransitionError(current.status, nextStatus);
  }
}

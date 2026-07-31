import mongoose from 'mongoose';
import { assertTransition } from '../domain/order-status.js';

const orderSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    telegramUserId: { type: Number, required: true, index: true },
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

const OrderModel = mongoose.models.Order ?? mongoose.model('Order', orderSchema);

function normalize(document) {
  if (!document) return null;
  const object = document.toObject ? document.toObject() : document;
  return {
    ...object,
    id: object._id,
    _id: undefined
  };
}

export class MongoOrderRepository {
  async create(order) {
    const created = await OrderModel.create({ ...order, _id: order.id, id: undefined });
    return normalize(created);
  }

  async findById(id) {
    return normalize(await OrderModel.findById(id).lean());
  }

  async updateStatus(id, nextStatus) {
    const current = await OrderModel.findById(id).lean();
    if (!current) return null;
    assertTransition(current.status, nextStatus);

    const updated = await OrderModel.findOneAndUpdate(
      { _id: id, status: current.status },
      { $set: { status: nextStatus } },
      { new: true }
    ).lean();

    if (!updated) throw new Error('Order status changed concurrently');
    return normalize(updated);
  }
}

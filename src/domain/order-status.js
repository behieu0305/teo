export const ORDER_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PREPARING: 'PREPARING',
  SHIPPING: 'SHIPPING',
  COMPLETED: 'COMPLETED',
  CANCELED: 'CANCELED'
});

const allowedTransitions = Object.freeze({
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.COMPLETED],
  [ORDER_STATUS.COMPLETED]: [],
  [ORDER_STATUS.CANCELED]: []
});

export function canTransition(from, to) {
  return allowedTransitions[from]?.includes(to) ?? false;
}

// Every status that may legally precede `to`. Lets the repository express the
// guard as a single conditional update instead of a read-then-write race.
export function previousStatesFor(to) {
  return Object.keys(allowedTransitions).filter((from) => canTransition(from, to));
}

export class InvalidTransitionError extends Error {
  constructor(from, to) {
    super(`Invalid order transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
    this.code = 'INVALID_TRANSITION';
    this.from = from;
    this.to = to;
  }
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export function statusLabel(status) {
  return {
    [ORDER_STATUS.PENDING]: 'Chờ xác nhận',
    [ORDER_STATUS.PREPARING]: 'Đang chuẩn bị',
    [ORDER_STATUS.SHIPPING]: 'Đang giao',
    [ORDER_STATUS.COMPLETED]: 'Hoàn thành',
    [ORDER_STATUS.CANCELED]: 'Đã hủy'
  }[status] ?? status;
}

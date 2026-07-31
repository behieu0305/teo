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

export function assertTransition(from, to) {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid order transition: ${from} -> ${to}`);
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

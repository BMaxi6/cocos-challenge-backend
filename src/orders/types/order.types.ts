export const ORDER_SIDES = ['BUY', 'SELL'] as const;
export type OrderSide = (typeof ORDER_SIDES)[number];

export const ORDER_TYPES = ['MARKET', 'LIMIT'] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const ORDER_STATUSES = [
  'NEW',
  'FILLED',
  'REJECTED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_REJECTION_REASONS = [
  'INSUFFICIENT_FUNDS',
  'INSUFFICIENT_HOLDINGS',
  'MARKET_PRICE_NOT_AVAILABLE',
] as const;
export type OrderRejectionReason = (typeof ORDER_REJECTION_REASONS)[number];

export const ORDER_SIDES = ['BUY', 'SELL'] as const;
export type OrderSide = (typeof ORDER_SIDES)[number];

export const MOVEMENT_SIDES = [
  'BUY',
  'SELL',
  'CASH_IN',
  'CASH_OUT',
] as const;
export type MovementSide = (typeof MOVEMENT_SIDES)[number];

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

function assertOneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): T {
  if ((allowed as readonly string[]).includes(value)) {
    return value as T;
  }

  throw new Error(`Invalid ${label}: ${value}`);
}

export function parseOrderSide(value: string): OrderSide {
  return assertOneOf(value, ORDER_SIDES, 'order side');
}

export function parseMovementSide(value: string): MovementSide {
  return assertOneOf(value, MOVEMENT_SIDES, 'movement side');
}

export function parseOrderType(value: string): OrderType {
  return assertOneOf(value, ORDER_TYPES, 'order type');
}

export function parseOrderStatus(value: string): OrderStatus {
  return assertOneOf(value, ORDER_STATUSES, 'order status');
}

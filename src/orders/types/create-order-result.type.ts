import { Order } from '@prisma/client';
import { OrderRejectionReason } from './order.types';

export type CreateOrderResult = {
  order: Order;
  rejectionReason?: OrderRejectionReason;
};

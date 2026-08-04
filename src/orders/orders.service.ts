import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import {
  AmountTooLowError,
  InstrumentNotFoundError,
  InvalidOrderInputError,
  OrderNotCancellableError,
  OrderNotFoundError,
} from '../common/errors';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersRepository } from './orders.repository';
import { CreateOrderResult } from './types/create-order-result.type';
import {
  OrderRejectionReason,
  OrderSide,
  OrderStatus,
  OrderType,
  parseMovementSide,
  parseOrderStatus,
  parseOrderType,
} from './types/order.types';

@Injectable()
export class OrdersService {
  constructor(private readonly ordersRepository: OrdersRepository) {}

  async createOrder(
    user: AuthenticatedUser,
    dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    this.validateCreateOrderInput(dto);

    const result = await this.ordersRepository.runInUserTransaction(
      user.id,
      async (tx): Promise<CreateOrderResult> => {
        const instrument = await this.ordersRepository.findInstrumentById(
          tx,
          dto.instrumentId,
        );

        if (!instrument) {
          throw new InstrumentNotFoundError();
        }

        const executionPrice = await this.resolveExecutionPrice(
          tx,
          dto.instrumentId,
          dto.type,
          dto.price,
        );

        const now = new Date();

        if (executionPrice === null) {
          // Sin precio: rechazo de negocio (no input inválido).
          // amount sin precio no permite derivar size; 1 solo cumple size > 0.
          // REJECTED no afecta cash ni posiciones.
          const rejectedOrder = await this.ordersRepository.createOrder(tx, {
            instrumentId: dto.instrumentId,
            userId: user.id,
            side: dto.side,
            type: dto.type,
            size: dto.size ?? 1,
            price: null,
            status: 'REJECTED',
            datetime: now,
          });

          return {
            order: rejectedOrder,
            rejectionReason: 'MARKET_PRICE_NOT_AVAILABLE',
          };
        }

        const size = this.resolveOrderSize(dto, executionPrice);

        const rejectionReason = await this.validateAvailability(
          tx,
          user.id,
          dto.instrumentId,
          dto.side,
          size,
          executionPrice,
        );

        // MARKET válida y sin rechazo => FILLED inmediato.
        // LIMIT válida y sin rechazo => NEW (queda pendiente).
        const status: OrderStatus = rejectionReason
          ? 'REJECTED'
          : dto.type === 'MARKET'
            ? 'FILLED'
            : 'NEW';

        const order = await this.ordersRepository.createOrder(tx, {
          instrumentId: dto.instrumentId,
          userId: user.id,
          side: dto.side,
          type: dto.type,
          size,
          price: executionPrice,
          status,
          datetime: now,
        });

        return {
          order,
          rejectionReason,
        };
      },
    );

    return this.toOrderResponse(result);
  }

  async cancelOrder(
    user: AuthenticatedUser,
    orderId: number,
  ): Promise<OrderResponseDto> {
    const order = await this.ordersRepository.runInUserTransaction(
      user.id,
      async (tx) => {
        const existingOrder = await this.ordersRepository.findOrderByIdForUser(
          tx,
          orderId,
          user.id,
        );

        if (!existingOrder) {
          throw new OrderNotFoundError();
        }

        if (existingOrder.status !== 'NEW') {
          throw new OrderNotCancellableError();
        }

        return this.ordersRepository.updateOrderStatus(
          tx,
          orderId,
          'CANCELLED',
        );
      },
    );

    return this.toOrderResponse({ order });
  }

  private validateCreateOrderInput(dto: CreateOrderDto): void {
    const hasSize = dto.size !== undefined;
    const hasAmount = dto.amount !== undefined;

    if (hasSize === hasAmount) {
      throw new InvalidOrderInputError(
        'Exactly one of size or amount must be provided',
      );
    }

    if (dto.type === 'LIMIT' && dto.price === undefined) {
      throw new InvalidOrderInputError('LIMIT orders require price');
    }

    if (dto.type === 'MARKET' && dto.price !== undefined) {
      throw new InvalidOrderInputError(
        'MARKET orders do not accept a client-provided price',
      );
    }
  }

  private async resolveExecutionPrice(
    tx: Prisma.TransactionClient,
    instrumentId: number,
    type: OrderType,
    rawPrice: number | undefined,
  ): Promise<Prisma.Decimal | null> {
    if (type === 'LIMIT') {
      return new Prisma.Decimal(rawPrice as number);
    }

    return this.ordersRepository.findLatestClosePrice(tx, instrumentId);
  }

  private resolveOrderSize(
    dto: CreateOrderDto,
    executionPrice: Prisma.Decimal,
  ): number {
    if (dto.size !== undefined) {
      return dto.size;
    }

    // Para amount se usa floor(amount/price): nunca se compran fracciones
    // y nunca se supera el monto solicitado.
    const amount = new Prisma.Decimal(dto.amount as number);
    const computedSize = amount.div(executionPrice).floor().toNumber();

    if (computedSize <= 0) {
      throw new AmountTooLowError();
    }

    return computedSize;
  }

  private async validateAvailability(
    tx: Prisma.TransactionClient,
    userId: number,
    instrumentId: number,
    side: OrderSide,
    size: number,
    executionPrice: Prisma.Decimal,
  ): Promise<OrderRejectionReason | undefined> {
    if (side === 'BUY') {
      const availableCash = await this.ordersRepository.getAvailableCash(
        tx,
        userId,
      );
      const requiredCash = executionPrice.mul(size);

      return requiredCash.greaterThan(availableCash)
        ? 'INSUFFICIENT_FUNDS'
        : undefined;
    }

    const availableQuantity = await this.ordersRepository.getAvailableQuantity(
      tx,
      userId,
      instrumentId,
    );

    return size > availableQuantity ? 'INSUFFICIENT_HOLDINGS' : undefined;
  }

  private toOrderResponse(result: CreateOrderResult): OrderResponseDto {
    return {
      id: result.order.id,
      instrumentId: result.order.instrumentId,
      side: parseMovementSide(result.order.side),
      type: parseOrderType(result.order.type),
      size: result.order.size,
      price: result.order.price ? result.order.price.toFixed(2) : null,
      status: parseOrderStatus(result.order.status),
      datetime: result.order.datetime.toISOString(),
      rejectionReason: result.rejectionReason,
    };
  }
}

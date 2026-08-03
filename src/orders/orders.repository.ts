import { Injectable } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type TransactionCallback<T> = (tx: Prisma.TransactionClient) => Promise<T>;

type CreateOrderInput = {
  instrumentId: number;
  userId: number;
  side: string;
  type: string;
  size: number;
  price: Prisma.Decimal | null;
  status: string;
  datetime: Date;
};

@Injectable()
export class OrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  runInUserTransaction<T>(userId: number, callback: TransactionCallback<T>) {
    return this.prisma.$transaction(async (tx) => {
      // Serializa operaciones por cuenta para evitar race conditions y doble uso de fondos.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      return callback(tx);
    });
  }

  findInstrumentById(tx: Prisma.TransactionClient, instrumentId: number) {
    return tx.instrument.findUnique({
      where: { id: instrumentId },
      select: { id: true, ticker: true, name: true, type: true },
    });
  }

  findLatestClosePrice(
    tx: Prisma.TransactionClient,
    instrumentId: number,
  ): Promise<Prisma.Decimal | null> {
    return tx.marketData
      .findFirst({
        where: {
          instrumentId,
          close: { not: null },
        },
        select: { close: true },
        orderBy: { date: 'desc' },
      })
      .then((row) => row?.close ?? null);
  }

  async getAvailableCash(
    tx: Prisma.TransactionClient,
    userId: number,
  ): Promise<Prisma.Decimal> {
    // Efectivo ejecutado: saldo resultante de movimientos FILLED.
    const [executedRow] = await tx.$queryRaw<
      { executedCash: Prisma.Decimal }[]
    >`
        SELECT COALESCE(
          SUM(
            CASE
              WHEN status = 'FILLED' AND side = 'CASH_IN' THEN size
              WHEN status = 'FILLED' AND side = 'CASH_OUT' THEN -size
              WHEN status = 'FILLED' AND side = 'BUY' THEN -(size * price)
              WHEN status = 'FILLED' AND side = 'SELL' THEN (size * price)
              ELSE 0
            END
          ),
          0
        )::numeric AS "executedCash"
        FROM orders
        WHERE userid = ${userId}
      `;

    // Efectivo reservado por BUY LIMIT en estado NEW (es del usuario, pero no operable).
    const [reservedRow] = await tx.$queryRaw<
      { reservedCash: Prisma.Decimal }[]
    >`
      SELECT COALESCE(SUM(size * price), 0)::numeric AS "reservedCash"
      FROM orders
      WHERE userid = ${userId}
        AND status = 'NEW'
        AND type = 'LIMIT'
        AND side = 'BUY'
    `;

    return executedRow.executedCash.minus(reservedRow.reservedCash);
  }

  async getAvailableQuantity(
    tx: Prisma.TransactionClient,
    userId: number,
    instrumentId: number,
  ): Promise<number> {
    // Tenencia disponible = posición ejecutada - acciones reservadas por SELL LIMIT NEW.
    const [row] = await tx.$queryRaw<{ availableQuantity: number }[]>`
      SELECT COALESCE(
        SUM(
          CASE
            WHEN status = 'FILLED' AND side = 'BUY' THEN size
            WHEN status = 'FILLED' AND side = 'SELL' THEN -size
            WHEN status = 'NEW' AND type = 'LIMIT' AND side = 'SELL' THEN -size
            ELSE 0
          END
        ),
        0
      )::int AS "availableQuantity"
      FROM orders
      WHERE userid = ${userId}
        AND instrumentid = ${instrumentId}
    `;

    return row.availableQuantity;
  }

  createOrder(
    tx: Prisma.TransactionClient,
    data: CreateOrderInput,
  ): Promise<Order> {
    return tx.order.create({ data });
  }

  findOrderByIdForUser(
    tx: Prisma.TransactionClient,
    orderId: number,
    userId: number,
  ): Promise<Order | null> {
    return tx.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
    });
  }

  updateOrderStatus(
    tx: Prisma.TransactionClient,
    orderId: number,
    status: string,
  ): Promise<Order> {
    return tx.order.update({
      where: { id: orderId },
      data: { status },
    });
  }
}

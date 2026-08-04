import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { OrderSide, parseOrderSide } from '../orders/types/order.types';

type FilledStockOrder = {
  id: number;
  instrumentId: number;
  side: OrderSide;
  size: number;
  price: Prisma.Decimal | null;
  datetime: Date;
  instrument: {
    id: number;
    ticker: string;
    name: string;
    type: string;
  };
};

@Injectable()
export class PortfolioRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCashSummary(userId: number): Promise<{
    executedCash: Prisma.Decimal;
    availableCash: Prisma.Decimal;
  }> {
    const [row] = await this.prisma.$queryRaw<
      { executedCash: Prisma.Decimal; reservedCash: Prisma.Decimal }[]
    >`
      SELECT
        COALESCE(
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
        )::numeric AS "executedCash",
        COALESCE(
          SUM(
            CASE
              WHEN status = 'NEW' AND type = 'LIMIT' AND side = 'BUY'
                THEN size * price
              ELSE 0
            END
          ),
          0
        )::numeric AS "reservedCash"
      FROM orders
      WHERE userid = ${userId}
    `;

    return {
      executedCash: row.executedCash,
      availableCash: row.executedCash.minus(row.reservedCash),
    };
  }

  async getFilledStockOrders(userId: number): Promise<FilledStockOrder[]> {
    const rows = await this.prisma.order.findMany({
      where: {
        userId,
        status: 'FILLED',
        side: {
          in: ['BUY', 'SELL'],
        },
        instrument: {
          type: 'ACCIONES',
        },
      },
      select: {
        id: true,
        instrumentId: true,
        side: true,
        size: true,
        price: true,
        datetime: true,
        instrument: {
          select: {
            id: true,
            ticker: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: [{ instrumentId: 'asc' }, { datetime: 'asc' }, { id: 'asc' }],
    });

    return rows.map((row) => ({
      ...row,
      side: parseOrderSide(row.side),
    }));
  }

  async getLatestMarketPrices(
    instrumentIds: number[],
  ): Promise<Map<number, Prisma.Decimal>> {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    // DISTINCT ON aprovecha uq_marketdata_instrument_date (instrumentid, date).
    const rows = await this.prisma.$queryRaw<
      { instrumentId: number; close: Prisma.Decimal }[]
    >`
      SELECT DISTINCT ON (instrumentid)
             instrumentid AS "instrumentId",
             close
      FROM marketdata
      WHERE instrumentid = ANY(${instrumentIds})
        AND close IS NOT NULL
      ORDER BY instrumentid, date DESC
    `;

    return new Map(rows.map((row) => [row.instrumentId, row.close]));
  }
}

import { Injectable } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type FilledStockOrder = Pick<
  Order,
  'instrumentId' | 'side' | 'size' | 'price' | 'datetime' | 'id'
> & {
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
    const [executedRow] = await this.prisma.$queryRaw<
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

    const [reservedRow] = await this.prisma.$queryRaw<
      { reservedCash: Prisma.Decimal }[]
    >`
      SELECT COALESCE(SUM(size * price), 0)::numeric AS "reservedCash"
      FROM orders
      WHERE userid = ${userId}
        AND status = 'NEW'
        AND type = 'LIMIT'
        AND side = 'BUY'
    `;

    return {
      executedCash: executedRow.executedCash,
      availableCash: executedRow.executedCash.minus(reservedRow.reservedCash),
    };
  }

  getFilledStockOrders(userId: number): Promise<FilledStockOrder[]> {
    return this.prisma.order.findMany({
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
  }

  async getLatestMarketPrices(
    instrumentIds: number[],
  ): Promise<Map<number, Prisma.Decimal>> {
    if (instrumentIds.length === 0) {
      return new Map();
    }

    const rows = await this.prisma.marketData.findMany({
      where: {
        instrumentId: { in: instrumentIds },
        close: { not: null },
      },
      select: {
        instrumentId: true,
        close: true,
        date: true,
      },
      orderBy: [{ instrumentId: 'asc' }, { date: 'desc' }],
    });

    const latest = new Map<number, Prisma.Decimal>();
    for (const row of rows) {
      if (!latest.has(row.instrumentId) && row.close) {
        latest.set(row.instrumentId, row.close);
      }
    }

    return latest;
  }
}

import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { FilledOrderMissingPriceError } from '../common/errors';
import {
  PortfolioPositionDto,
  PortfolioResponseDto,
} from './dto/portfolio-response.dto';
import { PortfolioRepository } from './portfolio.repository';

@Injectable()
export class PortfolioService {
  constructor(private readonly portfolioRepository: PortfolioRepository) {}

  async getPortfolio(user: AuthenticatedUser): Promise<PortfolioResponseDto> {
    const [cashSummary, filledOrders] = await Promise.all([
      this.portfolioRepository.getCashSummary(user.id),
      this.portfolioRepository.getFilledStockOrders(user.id),
    ]);

    const stateByInstrument = new Map<
      number,
      {
        instrumentId: number;
        ticker: string;
        name: string;
        quantity: number;
        averageCost: Prisma.Decimal;
      }
    >();

    for (const order of filledOrders) {
      if (order.price == null) {
        throw new FilledOrderMissingPriceError(order.id);
      }

      const price = order.price;
      const existing = stateByInstrument.get(order.instrumentId) ?? {
        instrumentId: order.instrumentId,
        ticker: order.instrument.ticker,
        name: order.instrument.name,
        quantity: 0,
        averageCost: new Prisma.Decimal(0),
      };

      if (order.side === 'BUY') {
        const currentCost = existing.averageCost.mul(existing.quantity);
        const buyCost = price.mul(order.size);
        const nextQuantity = existing.quantity + order.size;
        const nextAverageCost = currentCost.plus(buyCost).div(nextQuantity);

        existing.quantity = nextQuantity;
        existing.averageCost = nextAverageCost;
      }

      if (order.side === 'SELL') {
        const nextQuantity = existing.quantity - order.size;
        if (nextQuantity <= 0) {
          existing.quantity = 0;
          existing.averageCost = new Prisma.Decimal(0);
        } else {
          existing.quantity = nextQuantity;
        }
      }

      stateByInstrument.set(order.instrumentId, existing);
    }

    const openPositions = [...stateByInstrument.values()].filter(
      (position) => position.quantity > 0,
    );

    const latestPrices = await this.portfolioRepository.getLatestMarketPrices(
      openPositions.map((position) => position.instrumentId),
    );

    const positions: PortfolioPositionDto[] = [];
    let marketValueTotal = new Prisma.Decimal(0);

    for (const position of openPositions) {
      const marketPrice = latestPrices.get(position.instrumentId);
      if (!marketPrice) {
        continue;
      }

      const marketValue = marketPrice.mul(position.quantity);
      const positionCost = position.averageCost.mul(position.quantity);
      const totalReturnPercentage = positionCost.equals(0)
        ? new Prisma.Decimal(0)
        : marketValue.minus(positionCost).div(positionCost).mul(100);

      marketValueTotal = marketValueTotal.plus(marketValue);

      positions.push({
        instrumentId: position.instrumentId,
        ticker: position.ticker,
        name: position.name,
        quantity: position.quantity,
        averageCost: position.averageCost.toFixed(2),
        marketPrice: marketPrice.toFixed(2),
        marketValue: marketValue.toFixed(2),
        totalReturnPercentage: totalReturnPercentage.toFixed(2),
      });
    }

    const totalValue = cashSummary.executedCash.plus(marketValueTotal);

    return {
      totalValue: totalValue.toFixed(2),
      availableCash: cashSummary.availableCash.toFixed(2),
      positions,
    };
  }
}

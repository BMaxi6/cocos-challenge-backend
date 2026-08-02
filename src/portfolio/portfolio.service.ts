import { Injectable } from '@nestjs/common';
import { PortfolioRepository } from './portfolio.repository';

@Injectable()
export class PortfolioService {
  constructor(private readonly portfolioRepository: PortfolioRepository) {}
}

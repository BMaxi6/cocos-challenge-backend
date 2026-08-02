import { Controller } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@ApiSecurity('X-USER-ID')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}
}

import { Controller, Get } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PortfolioResponseDto } from './dto/portfolio-response.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@ApiSecurity('X-USER-ID')
@Controller('portfolio')
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'Get user portfolio' })
  @ApiOkResponse({
    description: 'User portfolio with cash and open positions',
    type: PortfolioResponseDto,
  })
  getPortfolio(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortfolioResponseDto> {
    return this.portfolioService.getPortfolio(user);
  }
}

import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';

@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Application and database health check' })
  async check() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      database: 'up',
    };
  }
}

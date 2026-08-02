import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { OrdersModule } from './orders/orders.module';
import { PortfolioModule } from './portfolio/portfolio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    LoggerModule.forRootAsync({
      inject: [],
      useFactory: () => ({
        pinoHttp: {
          level: process.env.LOG_LEVEL ?? 'info',
          genReqId: (req, res) => {
            const requestId = req.headers['x-request-id'] ?? randomUUID();
            res.setHeader('x-request-id', String(requestId));
            return requestId;
          },
          transport:
            process.env.PRETTY_LOGS === 'true'
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                }
              : undefined,
        },
      }),
    }),
    DatabaseModule,
    AuthModule,
    HealthModule,
    InstrumentsModule,
    OrdersModule,
    PortfolioModule,
  ],
  providers: [GlobalExceptionFilter],
})
export class AppModule {}

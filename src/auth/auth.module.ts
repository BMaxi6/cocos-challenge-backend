import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { UserAuthGuard } from './user-auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserAuthGuard,
    },
  ],
})
export class AuthModule {}

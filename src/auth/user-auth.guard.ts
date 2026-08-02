import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import {
  InvalidUserIdError,
  UserNotFoundError,
} from '../common/errors/domain-errors';
import { PrismaService } from '../database/prisma.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import {
  AuthenticatedUser,
  REQUEST_USER_KEY,
} from './types/authenticated-user';

@Injectable()
export class UserAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { [REQUEST_USER_KEY]?: AuthenticatedUser }>();

    const userId = this.parseUserId(request.headers['x-user-id']);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        accountNumber: true,
      },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    request[REQUEST_USER_KEY] = user;
    return true;
  }

  private parseUserId(headerValue: string | string[] | undefined): number {
    if (headerValue === undefined) {
      throw new InvalidUserIdError('X-USER-ID header is required');
    }

    const rawValue = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (!rawValue || !/^\d+$/.test(rawValue)) {
      throw new InvalidUserIdError();
    }

    const userId = Number(rawValue);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new InvalidUserIdError();
    }

    return userId;
  }
}

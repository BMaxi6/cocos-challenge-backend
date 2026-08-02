import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  AuthenticatedUser,
  REQUEST_USER_KEY,
} from '../../auth/types/authenticated-user';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<{
      [REQUEST_USER_KEY]?: AuthenticatedUser;
    }>();

    const user = request[REQUEST_USER_KEY];

    if (!user) {
      throw new Error(
        'CurrentUser decorator used without an authenticated user on the request',
      );
    }

    return user;
  },
);

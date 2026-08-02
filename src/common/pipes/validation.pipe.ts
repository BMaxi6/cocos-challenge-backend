import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ErrorCode } from '../errors/error-codes';

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.flatMap((error) => {
    const current = error.constraints ? Object.values(error.constraints) : [];
    const children = error.children?.length
      ? flattenValidationErrors(error.children)
      : [];

    return [...current, ...children];
  });
}

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors: ValidationError[]) => {
      const messages = flattenValidationErrors(errors);

      return new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: messages.join('; ') || 'Validation failed',
      });
    },
  });
}

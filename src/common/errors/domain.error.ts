import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes';

export class DomainError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: HttpStatus,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

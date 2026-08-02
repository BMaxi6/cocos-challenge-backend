import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain.error';
import { ErrorCode } from './error-codes';

export class UserNotFoundError extends DomainError {
  constructor(message = 'User not found') {
    super(ErrorCode.USER_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class InstrumentNotFoundError extends DomainError {
  constructor(message = 'Instrument not found') {
    super(ErrorCode.INSTRUMENT_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class OrderNotFoundError extends DomainError {
  constructor(message = 'Order not found') {
    super(ErrorCode.ORDER_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class OrderNotCancellableError extends DomainError {
  constructor(message = 'Only orders with status NEW can be cancelled') {
    super(ErrorCode.ORDER_NOT_CANCELLABLE, message, HttpStatus.CONFLICT);
  }
}

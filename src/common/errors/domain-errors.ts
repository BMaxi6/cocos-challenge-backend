import { HttpStatus } from '@nestjs/common';
import { DomainError } from './domain.error';
import { ErrorCode } from './error-codes';

export class UserNotFoundError extends DomainError {
  constructor(message = 'User not found') {
    super(ErrorCode.USER_NOT_FOUND, message, HttpStatus.NOT_FOUND);
  }
}

export class InvalidUserIdError extends DomainError {
  constructor(message = 'X-USER-ID header must be a positive integer') {
    super(ErrorCode.INVALID_USER_ID, message, HttpStatus.BAD_REQUEST);
  }
}

export class InvalidOrderInputError extends DomainError {
  constructor(message = 'Order input is invalid') {
    super(ErrorCode.INVALID_ORDER_INPUT, message, HttpStatus.BAD_REQUEST);
  }
}

export class AmountTooLowError extends DomainError {
  constructor(message = 'Amount is too low for the current price') {
    super(ErrorCode.AMOUNT_TOO_LOW, message, HttpStatus.BAD_REQUEST);
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

import { ErrorCodes } from '../errors/error-codes';
import { BaseException } from './base.exception';
import { HttpStatus } from '@nestjs/common';

export class UnauthorizedException extends BaseException {
  constructor(message?: string) {
    super(message || 'Unauthorized', HttpStatus.UNAUTHORIZED, {
      errorCode: ErrorCodes.UnauthorizedError,
    });
  }
}

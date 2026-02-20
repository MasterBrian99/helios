import { HttpStatus } from '@nestjs/common';
import { BaseException } from './base.exception';
import { ErrorCodes } from '../errors/error-codes';

export class InvalidLoginOrPasswordException extends BaseException {
  constructor() {
    super('Invalid login or password', HttpStatus.UNAUTHORIZED, {
      errorCode: ErrorCodes.InvalidLoginOrPasswordError,
    });
  }
}

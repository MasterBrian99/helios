import { HttpStatus } from '@nestjs/common';

export class StandardResponse<T = void> {
  public statusCode: HttpStatus;
  public message: string;
  public data?: T;

  constructor(statusCode: HttpStatus, message: string, data?: T) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}

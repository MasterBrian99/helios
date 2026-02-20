import { BaseException } from '../exceptions/base.exception';
import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';

@Catch(BaseException)
export class BaseExceptionsFilter implements ExceptionFilter {
  catch(exception: BaseException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const message = exception.message;
    const options = exception.extra;
    const error = exception.name;

    response.status(status).json({
      statusCode: status,
      message,
      error,
      errorCode: options.errorCode,
      errors: options.errors as unknown,
    });
  }
}

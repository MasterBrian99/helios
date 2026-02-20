import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exception.filter';
import { BaseExceptionsFilter } from './common/filters/base-exception.filter';
import { ValidationException } from './common/exceptions/validation.exception';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    snapshot: true,
  });
  app.useLogger(new Logger());
  app.useGlobalFilters(new AllExceptionsFilter(), new BaseExceptionsFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        return new ValidationException(errors);
      },
      transform: true,
      whitelist: true,
      validationError: { target: false },
    }),
  );

  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap()
  .then(() => {
    console.log('Application is running on: http://localhost:3000');
  })
  .catch((error) => {
    console.error('Application failed to start:', error);
  });

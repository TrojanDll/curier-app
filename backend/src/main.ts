import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Replace default logger with Pino once the container is ready.
  const logger = app.get(Logger);
  app.useLogger(logger);

  // All API routes live under /api/* (§5 of completion_plan.md). The liveness
  // probe is intentionally exempt so external monitors hit `/health` directly.
  app.setGlobalPrefix('api', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });

  // Global class-validator pipe (§14.2.14). transform=true lets DTOs declare
  // their fields with real types (number, OrderStatus[], Date-as-ISO-string)
  // and have class-transformer apply @Type / @Transform before the handler
  // sees the payload — so services receive already-parsed values.
  //
  // whitelist + forbidNonWhitelisted reject unknown keys outright instead of
  // silently dropping them: callers (admin, Android) are first-party, so a
  // rogue field is a bug we want to surface as 400, not a permissive shim.
  //
  // enableImplicitConversion is OFF deliberately — every coercion must be
  // explicit via @Type so DTO-as-source-of-truth stays auditable.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 8081);

  // Enable graceful shutdown so onModuleDestroy / onApplicationShutdown fire.
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();

import { RequestMethod } from '@nestjs/common';
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

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 8081);

  // Enable graceful shutdown so onModuleDestroy / onApplicationShutdown fire.
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();

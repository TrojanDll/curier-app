import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Replace default logger with Pino once the container is ready.
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const port = Number(config.get<string>('PORT') ?? 8081);

  // Enable graceful shutdown so onModuleDestroy / onApplicationShutdown fire.
  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`Backend listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();

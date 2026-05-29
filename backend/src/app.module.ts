import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CouriersModule } from './couriers/couriers.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PhotosModule } from './photos/photos.module';
import { PrismaModule } from './prisma/prisma.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SeedModule } from './seed/seed.module';
import { SettingsModule } from './settings/settings.module';
import { StatisticsModule } from './statistics/statistics.module';
import { SystemModule } from './system/system.module';

const isProduction = process.env['NODE_ENV'] === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CouriersModule,
    OrdersModule,
    HealthModule,
    PhotosModule,
    RealtimeModule,
    SeedModule,
    SettingsModule,
    StatisticsModule,
    SystemModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env['LOG_LEVEL'] ?? (isProduction ? 'info' : 'debug'),
        // Pretty output only in dev; production stays JSON-on-stdout (container friendly).
        ...(isProduction
          ? {}
          : {
              transport: {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  translateTime: 'SYS:standard',
                  // Keep req/res/responseTime visible in dev — they carry req.id
                  // (correlation) and statusCode, which are critical for
                  // debugging and for the §14.2.12 e2e check.
                  ignore: 'pid,hostname',
                  messageFormat: '{context} - {msg}',
                },
              },
            }),
        // Trust an incoming x-request-id so a caller can correlate; otherwise
        // mint a UUID v4. Echo the value back as a response header in the same
        // hook so the contract stays in one place.
        genReqId: (req: IncomingMessage, res: ServerResponse): string => {
          const raw = req.headers['x-request-id'];
          const candidate = Array.isArray(raw) ? raw[0] : raw;
          const id =
            typeof candidate === 'string' && candidate.trim().length > 0
              ? candidate.trim()
              : randomUUID();
          res.setHeader('x-request-id', id);
          return id;
        },
        customLogLevel: (
          _req: IncomingMessage,
          res: ServerResponse,
          err?: Error,
        ) => {
          if (err || res.statusCode >= 500) return 'error';
          if (res.statusCode >= 400) return 'warn';
          return 'info';
        },
        // /health is liveness-only; logging every probe would drown real traffic.
        autoLogging: {
          ignore: (req: IncomingMessage) => req.url === '/health',
        },
        serializers: {
          req: (req: IncomingMessage & { id?: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: ServerResponse) => ({
            statusCode: res.statusCode,
          }),
        },
      },
    }),
  ],
  providers: [
    // Global exception filter — single uniform error envelope across the API.
    // Registered via APP_FILTER (not main.ts useGlobalFilters) so it gets the
    // request-scoped PinoLogger injected — needed to log unhandled stacks
    // with the same `reqId` that pinoHttp puts on the HTTP log line.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}

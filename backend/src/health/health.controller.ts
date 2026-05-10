import { Controller, Get } from '@nestjs/common';

/**
 * Liveness probe (§14.2.12).
 *
 * Lives outside the global `/api` prefix so external probes (Docker, k8s,
 * uptime monitors) can reach `GET /health` directly. No DB ping — keeping
 * this lightweight makes it safe to call every few seconds. A separate
 * readiness endpoint can be added later if we ever need DB-aware probes.
 *
 * `LoggerModule` already filters `/health` out of pino-http auto-logging so
 * a frequent probe does not flood the request log.
 */
@Controller('health')
export class HealthController {
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

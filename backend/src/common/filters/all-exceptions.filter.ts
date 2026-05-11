import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { MulterError } from 'multer';
import { PinoLogger } from 'nestjs-pino';

/**
 * Global error envelope every API client receives. The shape is fixed so
 * admin/Android can branch on `error` (machine-readable) and surface
 * `message` (human-readable). `requestId` echoes the same id we set on the
 * `x-request-id` response header — grep the backend log by that to find
 * the matching pino HTTP line and any unhandled-exception stack.
 */
interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
  requestId?: string;
  timestamp: string;
  path: string;
}

interface Classified {
  statusCode: number;
  message: string | string[];
  error: string;
  /** True only for genuinely-unexpected errors that warrant a stack-trace log. */
  logUnknown: boolean;
}

/**
 * Catches everything (`@Catch()` with no arg). Order of `instanceof` checks
 * matters — `HttpException` is the most common case and comes first.
 *
 * Logging policy:
 *   - 4xx/5xx HTTP exceptions: silent here. `pinoHttp.customLogLevel` already
 *     stamps the request log line at warn/error. Logging again would duplicate.
 *   - Unknown / Prisma validation / Prisma default: write a single `error`
 *     line with `err` + `reqId` + `path` so the stack survives.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const classified = this.classify(exception);

    if (classified.logUnknown) {
      this.logger.error(
        {
          err: exception,
          reqId: request.id,
          path: request.url,
        },
        'Unhandled exception',
      );
    }

    const body: ErrorBody = {
      statusCode: classified.statusCode,
      message: classified.message,
      error: classified.error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
    if (request.id) body.requestId = request.id;

    response.status(classified.statusCode).json(body);
  }

  private classify(exception: unknown): Classified {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const { message, error } = normalizeHttpResponse(
        exception.getResponse(),
        exception.message,
      );
      return {
        statusCode: status,
        message,
        error: error ?? reasonPhrase(status),
        logUnknown: false,
      };
    }

    if (exception instanceof MulterError) {
      const isTooLarge = exception.code === 'LIMIT_FILE_SIZE';
      const status = isTooLarge
        ? HttpStatus.PAYLOAD_TOO_LARGE
        : HttpStatus.BAD_REQUEST;
      return {
        statusCode: status,
        message: exception.message,
        error: reasonPhrase(status),
        logUnknown: false,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return classifyPrismaKnown(exception);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      // Schema mismatch from a malformed query — bug on our side, but body
      // would leak column names so keep it generic and log the stack.
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid input',
        error: 'Bad Request',
        logUnknown: true,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'Internal Server Error',
      logUnknown: true,
    };
  }
}

function classifyPrismaKnown(
  e: Prisma.PrismaClientKnownRequestError,
): Classified {
  switch (e.code) {
    case 'P2002':
      // Unique-constraint violation. Don't leak the field — services that
      // care about a specific message throw an HttpException themselves.
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Resource already exists',
        error: 'Conflict',
        logUnknown: false,
      };
    case 'P2025':
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Resource not found',
        error: 'Not Found',
        logUnknown: false,
      };
    case 'P2003':
      // Foreign-key violation (e.g., assigning to a deleted courier).
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Related resource constraint violated',
        error: 'Conflict',
        logUnknown: false,
      };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Database error',
        error: 'Internal Server Error',
        logUnknown: true,
      };
  }
}

/**
 * Nest's HttpException.getResponse() returns either a string or an object
 * — and for ValidationPipe + class-validator the object shape is
 * `{ message: string[], error: 'Bad Request', statusCode: 400 }`. Preserve
 * arrays so per-field errors survive to the client.
 */
function normalizeHttpResponse(
  raw: string | object,
  fallback: string,
): { message: string | string[]; error?: string } {
  if (typeof raw === 'string') {
    return { message: raw };
  }
  if (raw && typeof raw === 'object') {
    const obj = raw as { message?: unknown; error?: unknown };
    let message: string | string[] = fallback;
    if (typeof obj.message === 'string') {
      message = obj.message;
    } else if (
      Array.isArray(obj.message) &&
      obj.message.every((m) => typeof m === 'string')
    ) {
      message = obj.message;
    }
    const error = typeof obj.error === 'string' ? obj.error : undefined;
    return { message, error };
  }
  return { message: fallback };
}

/** HTTP reason phrase by status — kept small so we don't pull a dependency. */
function reasonPhrase(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 413:
      return 'Payload Too Large';
    case 415:
      return 'Unsupported Media Type';
    case 422:
      return 'Unprocessable Entity';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    default:
      return 'Error';
  }
}

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Thin NestJS wrapper around PrismaClient.
 *
 * Lifecycle:
 *  - onModuleInit  → opens the DB pool
 *  - onModuleDestroy → closes it (fired by app.enableShutdownHooks() in main.ts)
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

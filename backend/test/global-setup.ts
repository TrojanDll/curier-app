import { execSync } from 'node:child_process';

/**
 * Jest globalSetup: applies Prisma migrations to the test database once
 * before any spec runs. The DB itself must already exist — see the
 * one-time `CREATE DATABASE curier_test` step in docs/backend-testing.md.
 *
 * Idempotent: re-running just confirms all migrations are applied.
 */
export default async function (): Promise<void> {
  const testUrl =
    process.env.DATABASE_URL_TEST ??
    'postgresql://curier:curier_dev@localhost:55432/curier_test?schema=public';

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}

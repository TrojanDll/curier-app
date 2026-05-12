/**
 * Per-test env. Loaded before any module under test imports `ConfigService`,
 * so AppModule sees these values during `Test.createTestingModule(...)`.
 *
 * The test DB must exist prior to `npm run test:e2e` — see
 * `docs/backend-testing.md` for the one-time `CREATE DATABASE curier_test`
 * step. Migrations are applied by `global-setup.ts` on every run.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  'postgresql://curier:curier_dev@localhost:55432/curier_test?schema=public';
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? 'e2e_only_jwt_secret_min_length_padding_padding_padding';
process.env.JWT_ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? '15m';
process.env.JWT_REFRESH_TTL = process.env.JWT_REFRESH_TTL ?? '30d';
// Disable the seed-on-boot path so each spec can create its own first admin
// without colliding with the env-seeded one. SeedModule reads these and
// no-ops when both are missing.
delete process.env.INITIAL_ADMIN_USERNAME;
delete process.env.INITIAL_ADMIN_PASSWORD;
process.env.PHOTO_UPLOAD_DIR = process.env.PHOTO_UPLOAD_DIR ?? './uploads-test';
process.env.PHOTO_TTL_DAYS = process.env.PHOTO_TTL_DAYS ?? '30';
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

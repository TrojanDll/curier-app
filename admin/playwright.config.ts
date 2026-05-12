import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the admin SPA (§14.7.5). Targets the dev backend
 * (port 8081) + Next.js dev server (port 3000), both auto-started by
 * Playwright. Run via `npm run test:e2e` from /admin.
 *
 * The dev backend expects the dev Postgres on port 55432 — bring it up
 * with `docker compose -f ../docker-compose.dev.yml up -d` before the
 * first run (Playwright cannot start docker for you).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: 'list',

  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'npm run start --prefix ../backend',
      url: 'http://localhost:8081/health',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: 120_000,
      stdout: 'ignore',
      stderr: 'pipe',
    },
  ],
});

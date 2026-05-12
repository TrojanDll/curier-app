# Admin — Playwright E2E Reference

Browser-driven coverage for the Next.js admin SPA (§14.7.5). Stored
under `admin/e2e/`, run via `npm run test:e2e` from `/admin`.

## Toolchain

| Library | Use |
|---|---|
| `@playwright/test` | Test runner + assertion DSL |
| Playwright `chromium` | Headless browser (downloaded by `npx playwright install chromium`) |

Config in `admin/playwright.config.ts`. Two `webServer` entries auto-start:

| Service | Command | URL |
|---|---|---|
| Backend | `npm run start --prefix ../backend` | `http://localhost:8081/health` |
| Admin   | `npm run dev`                       | `http://localhost:3000` |

`reuseExistingServer: true` so a running dev session isn't restarted.

## Prerequisites

The dev Postgres must be reachable on `localhost:55432`:

```bash
docker compose -f docker-compose.dev.yml up -d
```

`backend/.env` already pins:

```
DATABASE_URL=postgresql://curier:curier_dev@localhost:55432/curier?schema=public
INITIAL_ADMIN_USERNAME=admin
INITIAL_ADMIN_PASSWORD=admin
```

so the first backend boot seeds the admin used by the test suite.

## Current coverage

| Spec | # tests | Notes |
|---|---|---|
| `admin-login.spec.ts` | 5 | form renders, blank/invalid/valid submits, middleware redirect |

Run: `npm run test:e2e` from `/admin`. Use `npx playwright show-report`
to inspect retained traces from failures.

## Locator hygiene

Next.js injects a hidden `<div role="alert" id="__next-route-announcer__">`
for navigation announcements. A bare `getByRole('alert')` matches **both**
that div and any in-page error, breaking strict mode. Filter by text:

```ts
await expect(
  page.getByRole('alert').filter({ hasText: 'Заполните логин и пароль' }),
).toBeVisible();
```

## Expanding coverage later

For order creation / reassignment flows, seed couriers + orders directly
against `curier` via the backend API in `test.beforeEach`, then drive the
admin UI. Avoid SQL-level fixtures — they couple the test to the schema
and rot faster than the API.

# Seed — Backend Reference

NestJS `SeedModule` (Stage 2.11). Source: `backend/src/seed/`.

Bootstrap-time seeders. Currently scoped to the first-admin auto-seed; further
seeders go in the same module.

## First-admin seed

Runs once during `OnApplicationBootstrap`. Decision matrix:

| `admins` row count | `INITIAL_ADMIN_USERNAME` & `_PASSWORD` | Outcome | Log level |
|---|---|---|---|
| `>= 1` | any | Skip | `debug` — `Admin seed skipped: N admin(s) already exist` |
| `0` | both non-blank | Insert one admin | `info` — `Seeded initial admin '<username>'` |
| `0` | either blank/missing | Skip | `warn` — `Admin seed skipped: INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_PASSWORD are not configured. Seed an admin manually before logging in.` |

Notes:

- Once any admin row exists the seeder never re-seeds or overwrites — even if
  the env values change. Subsequent credential changes go through the regular
  admin password reset flow.
- Bootstrap never fails because of a missing seed env. A blank env on first
  start logs a warning and keeps the server up so the operator can recover.
- Password is bcrypt-hashed via `auth/password.util.ts` (cost 10), matching
  `couriers` creation.
- `username` and `INITIAL_ADMIN_FULL_NAME` are trimmed; `password` is preserved
  verbatim so leading/trailing whitespace stays intentional.
- The seeder relies on `OnApplicationBootstrap`, which fires after every
  module's `onModuleInit`, so `PrismaService.$connect()` has already happened.

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `INITIAL_ADMIN_USERNAME` | only if seeding | — | Trimmed before insert. |
| `INITIAL_ADMIN_PASSWORD` | only if seeding | — | Bcrypt-hashed, not trimmed. |
| `INITIAL_ADMIN_FULL_NAME` | no | `Initial Admin` | Trimmed; blank → default. |

`.env.example` ships defaults `admin` / `admin` / `Initial Admin` so a fresh
`docker compose up -d` lands a working admin login out of the box.

## What is NOT here yet

- No CLI script for manual seeding. Until one exists, the Stage 6 `DEPLOYMENT.md`
  flow is "set env → bring up the stack → log in → change password".
- No re-seed / reset capability. Wiping `admins` and restarting the backend is
  the only way to re-trigger the seeder.

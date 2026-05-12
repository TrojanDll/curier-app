# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — builder: install full deps, generate Prisma client, nest build
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# package.json + lockfile first for the npm-ci layer cache. prisma/ has to come
# before `npm ci` too because the `postinstall` script runs `prisma generate`,
# which needs the schema file at the same path it has at runtime.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# Source — separated COPY so a code edit doesn't bust the deps layer.
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runner: production deps only + compiled dist + Prisma client/CLI
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# wget is shipped in alpine's busybox already (used by HEALTHCHECK below).
# We do not install curl on purpose — wget keeps the image smaller.

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8081 \
    # Mount-point for the photos volume (docker-compose maps a named volume here).
    PHOTO_UPLOAD_DIR=/app/uploads

# All COPY/RUN below own files as `node` from the start. `chown -R /app` after
# the fact would walk ~100k files in node_modules and add ~60s to the build.
COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node prisma ./prisma

# Production-only deps. --ignore-scripts skips the postinstall (which would
# run prisma generate before the Prisma CLI is available — it's a devDep);
# we instead copy the already-generated @prisma/client from the builder stage,
# along with the CLI binary so `prisma migrate deploy` can run at startup.
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force && \
    chown -R node:node /app/node_modules

COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=node:node /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --from=builder --chown=node:node /app/dist ./dist

# Uploads is a docker-compose volume mount-point — owning it as `node`
# lets the running process write photos without a runtime chown.
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node

EXPOSE 8081

# Liveness probe — hits the AppModule's `/health` endpoint (Stage 2.12), which
# is intentionally cheap and DB-free so docker-compose can use it as the
# `healthy` signal for the dependent admin service.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8081/health || exit 1

# Apply outstanding migrations first, then start the app. Both run as the
# `node` user; `prisma migrate deploy` (not `migrate dev`) is the
# production-safe variant — it never generates SQL, only applies pre-shipped
# migration files from /app/prisma/migrations.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

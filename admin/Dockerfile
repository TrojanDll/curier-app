# syntax=docker/dockerfile:1.7

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — deps: install with full lockfile, no source yet (best layer cache)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

# Copy lockfile manifests only — keeps this layer cached unless deps change.
COPY package.json package-lock.json ./
RUN npm ci

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — builder: bring source, run `next build` to produce
# `.next/standalone` (server) + `.next/static` (immutable assets)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# BACKEND_API_URL is needed at *build* time as well — Next traces fetches /
# `process.env` references for static optimisation. Compose passes the
# internal-network URL (e.g. http://backend:8081); the BFF reads it at
# runtime too.
ARG BACKEND_API_URL=http://backend:8081

ENV NEXT_TELEMETRY_DISABLED=1 \
    BACKEND_API_URL=$BACKEND_API_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 3 — runner: the standalone server only, no source, no devDeps
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Standalone tree already includes the minimum node_modules Next traced.
# `static` and `public` are not bundled into the trace, so they're copied
# explicitly next to the server.
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

USER node

EXPOSE 3000

# Same wget-spider pattern as backend. Next's standalone server handles "/"
# fine for liveness; if you later want a dedicated probe, route a tiny
# /api/health into the BFF and point HEALTHCHECK there.
# Use 127.0.0.1 explicitly — `localhost` resolves to IPv6 ::1 on some
# Alpine builds, but Next.js standalone binds only to IPv4 by default.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1

CMD ["node", "server.js"]

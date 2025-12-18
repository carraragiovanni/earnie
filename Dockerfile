# Single-image build: API + Web UI

FROM node:20-bookworm-slim AS deps
WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

FROM deps AS build
WORKDIR /app
COPY apps ./apps

RUN npm run db:generate -w @app/api
RUN npm run build -w @app/api
RUN npm run build -w @app/web

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Non-root user (works well with EFS access points)
RUN useradd -m -u 1000 appuser

# Keep full node_modules (includes prisma CLI for migrations)
COPY --from=deps /app/node_modules ./node_modules

# Copy API build + Prisma schema/migrations
COPY --from=build /app/apps/api ./apps/api

# Copy built web assets into API's public folder
RUN mkdir -p ./apps/api/public
COPY --from=build /app/apps/web/dist ./apps/api/public

RUN mkdir -p /data && chown -R 1000:1000 /data

USER 1000

EXPOSE 4000

# Run migrations against SQLite (mounted to /data in AWS), then start API
CMD ["bash", "-lc", "cd /app/apps/api && node_modules/.bin/prisma migrate deploy && node dist/index.js"]

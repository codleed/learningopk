# Stage 1: Build
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@10.30.1 --activate

WORKDIR /app

# Copy workspace root files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/shared/ packages/shared/
COPY backend/ backend/

# Build shared package first
RUN pnpm --filter @learningopk/shared build

# Build backend
RUN pnpm --filter backend build

# Prune production dependencies
RUN pnpm --filter backend deploy --prod /app/prod

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy production node_modules and built dist
COPY --from=builder /app/prod/node_modules ./node_modules
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/drizzle ./drizzle
COPY --from=builder /app/backend/package.json ./

# Copy shared package dist (needed at runtime)
COPY --from=builder /app/packages/shared/dist ./node_modules/@learningopk/shared/dist
COPY --from=builder /app/packages/shared/package.json ./node_modules/@learningopk/shared/package.json

EXPOSE 3001

COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]

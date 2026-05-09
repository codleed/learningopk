# Stage 1: Build
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY frontend/package.json frontend/
COPY packages/shared/package.json packages/shared/
COPY backend/package.json backend/

# Copy shared source (needed by prepare script during npm ci)
COPY packages/shared/ packages/shared/

# Install all dependencies (prepare auto-builds shared package)
RUN npm ci

# Copy backend source
COPY backend/ backend/

# Build backend
RUN npm --workspace backend run build

# Prune production dependencies
RUN npm prune --omit=dev --workspaces

# Stage 2: Runtime
FROM node:22-alpine

WORKDIR /app

# Copy production node_modules and built dist
COPY --from=builder /app/node_modules ./node_modules
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

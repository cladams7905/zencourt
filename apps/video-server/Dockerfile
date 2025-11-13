# syntax=docker/dockerfile:1

# =============================================================================
# Build stage – install deps & compile TypeScript (monorepo-aware)
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN npm run build --workspace=@zencourt/video-server
RUN npm install --omit=dev --workspace=@zencourt/video-server
RUN mkdir -p node_modules && cp -R apps/video-server/node_modules/. node_modules/ || true

# =============================================================================
# Runtime stage – slim prod image with FFmpeg binaries
# =============================================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache ffmpeg curl

ENV NODE_ENV=production \
  PORT=3001 \
  NODE_OPTIONS=--require=tsconfig-paths/register

WORKDIR /app

# Copy only the built artifacts and runtime deps
COPY --from=builder /app/apps/video-server/dist ./dist
COPY --from=builder /app/apps/video-server/package.json ./package.json
COPY --from=builder /app/apps/video-server/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY apps/video-server/tsconfig.runtime.json ./tsconfig.json

# Use default non-root user provided by the Node image
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]

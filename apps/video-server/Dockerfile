# syntax=docker/dockerfile:1

# =============================================================================
# Build stage – install deps & compile TypeScript (monorepo-aware)
# =============================================================================
FROM node:22-alpine AS builder

WORKDIR /src
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN npm ci
RUN rm -rf apps/video-server/dist apps/video-server/tsconfig.tsbuildinfo && npm run build --workspace=@zencourt/video-server

# =============================================================================
# Runtime stage – slim prod image with FFmpeg binaries
# =============================================================================
FROM node:22-alpine AS runner

RUN apk add --no-cache ffmpeg curl

ENV NODE_ENV=production \
  PORT=3001 \
  NODE_OPTIONS=--require=tsconfig-paths/register

WORKDIR /src

# Copy entire repo from builder to retain dist + deps
COPY --from=builder /src /src
COPY apps/video-server/tsconfig.runtime.json /src/tsconfig.json

# Use default non-root user provided by the Node image
USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# The compiled output includes the full monorepo path structure
CMD ["node", "apps/video-server/dist/apps/video-server/src/server.js"]

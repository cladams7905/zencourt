# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zencourt is an npm workspaces monorepo for a video generation platform serving real estate marketing. The architecture separates frontend (Vercel-deployed Next.js) from backend video processing (Hetzner-deployed Express + FFmpeg).

**Structure:**

```
apps/web/              # Next.js 15 frontend with Stack Auth + server actions
apps/video-server/     # Express backend with FFmpeg video processing
packages/db/           # Drizzle ORM + Neon PostgreSQL schema + client
packages/shared/       # Shared types, enums, utilities
```

**Tech Stack:**

- Frontend: Next.js 15, React 19, Tailwind CSS 4, Radix UI, TanStack Query, fal.ai
- Backend: Express, FFmpeg (fluent-ffmpeg), Pino logging, AWS SDK (S3-compatible)
- Database: Drizzle ORM, Neon PostgreSQL with Row-Level Security
- Auth: Stack Auth (@stackframe/stack)

## Common Development Commands

```bash
# First-time setup
npm install
npm run env:pull              # Pull environment variables from Vercel

# Daily development
npm run dev                   # Start Next.js web app (port 3000)
npm run dev:video             # Start video server (port 3001)

# Database operations
npm run db:push               # Quick schema sync for development
npm run db:generate           # Generate migration from schema changes
npm run db:migrate            # Apply migrations (production-safe)
npm run db:studio             # Open Drizzle Studio visual DB browser

# Testing (video-server only)
npm run test --workspace=@zencourt/video-server
npm run test:watch --workspace=@zencourt/video-server
npm run test:coverage --workspace=@zencourt/video-server

# Building
npm run build:web             # Build Next.js app
npm run build:video           # Compile TypeScript for video server
npm run build                 # Build all workspaces

# Docker (video-server)
npm run docker:rebuild        # Rebuild and restart container
npm run docker:logs           # View container logs
npm run docker:up             # Start container
npm run docker:down           # Stop container

# Type checking
npm run type-check --workspace=@zencourt/web
npm run type-check --workspace=@zencourt/video-server
```

## Code Architecture

### Web App (apps/web)

**Structure:**

- `app/` - Next.js App Router with API routes at `api/v1/`
- `app/api/v1/video/` - Video generation endpoints
- `app/api/v1/webhooks/` - Webhook handlers from video-server
- `components/ui/` - 50+ Radix UI components
- `middleware.ts` - Stack Auth session validation

**Authentication Flow:**

- Middleware checks `stack-access` and `stack-refresh` cookies
- Bypasses: `/handler/*` (auth pages), `/api/v1/webhooks/*`, Next.js internals
- Redirects unauthenticated users to `/handler/sign-in`

### Video Server (apps/video-server)

**Structure:**

- `routes/` - Express routes (video, webhooks, health, storage)
- `services/` - Business logic layer
  - `db/` - Repository pattern (`videoRepository`, `videoJobRepository`)
  - `ffmpegService` - Video processing with FFmpeg
  - `klingService` - fal.ai Kling AI video generation
  - `storageService` - S3-compatible storage (Backblaze B2)
  - `videoGenerationService` - Orchestration of video pipeline
  - `videoCompositionService` - Combining videos
  - `webhookService` - Downstream webhook delivery
- `middleware/` - Auth validation and error handling
- `config/` - Environment, logging, storage configuration

**Video Processing Pipeline:**

1. User uploads property images → stored as `collection_images` tied to a project collection.
2. Web workflow creates/updates a video `asset` record (stage, type, thumbnail) for the project.
3. Web app requests generation via `/video/generate`, creating a parent `video_assets` row plus `video_asset_jobs` (one per room).
4. Video-server dispatches each job to fal.ai (Kling) and tracks progress via `video_asset_jobs`.
5. fal.ai webhooks -> video-server: job assets downloaded, normalized, uploaded, job rows updated.
6. Once all jobs complete, video-server composes the final asset video, writes back to `video_assets`, and notifies the web app.
7. Web app updates UI/project workflow stage via `assets` table.

### Database (packages/db)

**Schema Highlights (`drizzle/schema.ts` via `@db/client`):**

- `projects` – Owns collections/assets; RLS scoped to owner.
- `collections` – 1:1 with project; keeps metadata for uploaded media.
- `collection_images` – Uploaded property imagery + AI classifications.
- `assets` – Generated deliverables per project (currently `type = "video"` with generation stage + thumbnail).
- `video_assets` – Finalized video output for a specific asset (one row per generation run).
- `video_asset_jobs` – Individual Kling job entries tied to `video_assets`.

> **Important:** Always import Drizzle helpers (`eq`, `and`, `inArray`, etc.) from `@db/client` rather than `drizzle-orm` directly so every workspace shares the same Drizzle instance/schema.

**Row-Level Security:**
All tables enforce user isolation via RLS policies. Stack Auth provides authentication, RLS provides defense-in-depth at the database level.

### Shared Package (packages/shared)

**Critical Utilities:**

- `utils/storagePaths.ts` - **Centralized storage key generation**. Both web and video-server MUST use these functions to maintain consistent file organization.
- `utils/logger.ts` - Pino logger configuration
- `types/` - Shared TypeScript types for API contracts

**Storage Path Pattern:**

```
user_{userId}/projects/project_{projectId}/videos/video_{videoAssetId}/...
```

## Critical Architectural Patterns

### 1. TypeScript Path Mappings

Centralized in `tsconfig.base.json` with workspace aliases:

- `@db/*` → `packages/db/src/*`
- `@shared/*` → `packages/shared/src/*`
- `@web/*` → `apps/web/src/*`
- `@video-server/*` → `apps/video-server/src/*`

**Important:** Path mappings must be duplicated in Jest config and tsconfig-paths for runtime resolution.

### 2. Storage Consistency

**Always use `@shared/utils/storagePaths.ts` functions** for generating storage keys. This ensures both web and video-server maintain identical file organization. Never construct storage paths manually.

### 3. Video Job Architecture

Each video generation is split into multiple `video_asset_jobs` (one per room). This enables:

- Parallel processing of individual videos
- Individual retry logic per job
- Granular error tracking

Fields include: `errorType`, `errorRetryable`, `errorMessage` for debugging.

### 4. Webhook Chain

**fal.ai → video-server → web app**

Video-server acts as middleware to add:

- Retry logic for failed requests
- Error categorization and handling
- Webhook delivery to web app

### 5. Database Access Consistency

- Use `@db/client` for **all** DB access (web + video-server) to guarantee a single source of schema and Drizzle helpers.
- Refrain from importing `drizzle-orm` helpers directly from node_modules—schema types will mismatch across packages.
- Server actions (web) and services (video-server) must respect project ownership checks already encoded in RLS/policies.

### 6. Docker Build Context

Video-server Dockerfile builds from **monorepo root** (`context: ../..`) to access shared packages. The build:

- Copies entire monorepo structure
- Installs dependencies for all workspaces
- Compiles TypeScript in container
- Includes FFmpeg binaries in Alpine image

### 7. Next.js Monorepo Configuration

Non-standard config in `next.config.ts`:

- Transpiles workspace packages (`@zencourt/db`, `@zencourt/shared`)
- Externalizes FFmpeg and Pino to prevent bundling issues
- Custom webpack config for FFmpeg binaries
- Output file tracing includes monorepo root

### 8. FFmpeg Handling

- **Docker:** Alpine image includes system FFmpeg binaries
- **Local dev:** Uses `ffmpeg-static` npm package
- Services abstract this via `ffmpegService`

## Key Files for Understanding the System

1. `packages/db/drizzle/schema.ts` - Complete data model with RLS policies
2. `packages/shared/utils/storagePaths.ts` - Storage architecture (critical!)
3. `packages/shared/types/models/db.asset.ts` - Asset + stage enums shared with frontend.
4. `packages/shared/types/models/db.video.ts` - Video + job type definitions.
5. `apps/video-server/src/services/videoGenerationService.ts` - Core orchestration logic.
6. `apps/video-server/src/services/db/*.ts` - Repositories that mutate DB state.
7. `apps/web/src/server/actions/db/*.ts` - Server actions wrapping DB access.
8. `apps/web/src/middleware.ts` - Stack Auth validation logic.
7. `tsconfig.base.json` - Monorepo path mappings
8. `.github/workflows/deploy-video-server.yml` - Hetzner deployment pipeline

## Deployment

- **Web App:** Vercel (automatic on push to `main`)
- **Video Server:** Hetzner via GitHub Actions
  - Builds Docker image → GHCR
  - SSH deploys to Hetzner VPS
  - Manual deployment: `scripts/deploy-hetzner.sh`

## Testing

Video-server has Jest configuration with:

- **Coverage threshold:** 70% (branches, functions, lines, statements)
- **Test patterns:** `**/__tests__/**/*.ts`, `**/*.{spec,test}.ts`
- **Module mapping:** Supports workspace aliases

Web app currently has no test suite configured.

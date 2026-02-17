# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Zencourt is an npm workspaces monorepo for a social media generation platform serving real estate marketing. The architecture separates frontend (Vercel-deployed Next.js) from backend video processing (Hetzner-deployed Express + Remotion rendering).

**Structure:**

```
apps/web/              # Next.js 15 frontend with Stack Auth + server actions
apps/video-server/     # Express backend with Runway/Kling orchestration + Remotion rendering
packages/db/           # Drizzle ORM + Neon PostgreSQL schema + client
packages/shared/       # Shared types, enums, utilities
```

**Tech Stack:**

- Frontend: Next.js 16, React 19, Tailwind CSS 4, Radix UI, TanStack Query, fal.ai
- Backend: Express, Remotion (server-side rendering), Runway SDK, fal.ai (Kling fallback), Pino logging, AWS SDK (S3-compatible)
- Database: Drizzle ORM, Neon PostgreSQL with Row-Level Security
- Auth: Stack Auth (@stackframe/stack)

## Common Development Commands

```bash
# First-time setup
npm install
npm run env:pull              # Pull environment variables from Vercel

# Daily development
npm run dev                   # Start Next.js web app (port 3000)
npm run dev:video             # Start video server (port 3001 via scripts/start-dev-server.sh)

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
npm run build:local           # Build Next.js app with local .env
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
  - `app/(dashboard)/` - Authenticated dashboard routes (listings, content, settings)
  - `app/(auth)/` - Auth screens (Stack Auth handlers)
  - `app/api/v1/content/` - Content generation endpoints (prompts + AI)
  - `app/api/v1/video/` - Video generation endpoints + config helpers
  - `app/api/v1/webhooks/` - Webhook handlers from video-server
- `components/` - Product UI by domain
  - `components/listings/` - Listing workflow views (sync, categorize, review, generate)
  - `components/dashboard/` - Content dashboard and grids
  - `components/uploads/` - Upload dialogs + external connectors
  - `components/ui/` - Radix UI component primitives
- `lib/prompts/` - Prompt templates, hooks, and assembly logic
- `server/actions/` - Server actions for DB and API wrappers
- `server/services/` - Market/community/property data, vision, and AI helpers
- `server/utils/` - Webhook verification + storage URL helpers
- `middleware.ts` - Stack Auth session validation

**Authentication Flow:**

- Middleware checks `stack-access` and `stack-refresh` cookies
- Bypasses: `/handler/*` (auth pages), `/api/v1/webhooks/*`, Next.js internals
- Redirects unauthenticated users to `/handler/sign-in`

**Critical Web App Folders:**

- `app/api/v1/content/generate/` - Content generation flow (prompt assembly + AI response parsing)
- `lib/prompts/` - Base prompts, hooks, compliance, and assembly helpers
- `server/services/community/` - Perplexity-powered community data + caching
- `server/services/marketDataService.ts` - Market insights lookup
- `server/services/listingPropertyService.ts` - Listing metadata + Perplexity enrichment
- `components/listings/` - Core listing workflow UI and steps

### Video Server (apps/video-server)

Details for the video server are maintained in `apps/video-server/README.md`. Refer to that file when you need routing, pipeline, or environment specifics. Keep this CLAUDE file focused on web app usage unless a task is explicitly about the video server.

### Database (packages/db)

**Schema Highlights (`drizzle/schema.ts` via `@db/client`):**

- `listings` – Primary entity for listing workflows.
- `content` – Record storing social media content assets with metadata.
- `video_gen_batch` – Parent video generation batch/run state.
- `video_gen_jobs` – Per-room generation jobs (Runway/Kling outputs).

> **Important:** Always import Drizzle helpers (`eq`, `and`, `inArray`, etc.) from `@db/client` rather than `drizzle-orm` directly so every workspace shares the same Drizzle instance/schema.

> **Migration Policy:** Schema migrations must be generated and applied by the user using "npm run db:generate" (do not manually create migration files).

**Row-Level Security:**
All tables enforce user isolation via RLS policies. Stack Auth provides authentication, RLS provides defense-in-depth at the database level.

### Shared Package (packages/shared)

**Critical Utilities:**

- `utils/storagePaths.ts` - **Centralized storage key generation**. Both web and video-server MUST use these functions to maintain consistent file organization.
- `utils/storageConfig.ts` - Shared Backblaze env parsing/validation for web + video-server.
- `utils/storagePaths.ts` also exports `buildStoragePublicUrl` and `extractStorageKeyFromUrl` for consistent URL building/parsing.
- `utils/logger.ts` - Pino logger configuration
- `types/` - Shared TypeScript types for API contracts

**Storage Path Pattern:**

```
user_{userId}/listings/listing_{listingId}/videos/video_{videoAssetId}/...
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
Also use shared helpers for storage URL parsing/building (`extractStorageKeyFromUrl`, `buildStoragePublicUrl`) and env config normalization (`buildStorageConfigFromEnv`) to avoid drift across runtimes.

**Signed URL naming:** server-side helpers use `getSignedDownloadUrl*` (see `apps/web/src/server/utils/storageUrls.ts` and `apps/video-server/src/services/storageService.ts`).

**Optional CDN:** set `STORAGE_PUBLIC_BASE_URL` to a CDN origin (e.g., `https://cdn.yourdomain.com`) to have storage services generate public URLs against the CDN instead of the raw B2 endpoint. Add the same env var to Vercel + video-server, and allow the hostname in `apps/web/next.config.ts` for `next/image`.

### 3. Video Job Architecture

Video job details live in `apps/video-server/README.md`. Keep this file focused on web app usage unless the task is video-server specific.

### 4. Large Component Organizational Standard (Web)

For large/monolithic frontend components (typically >200-300 LOC or files mixing orchestration + async + mapping + rendering), use this standard structure so domains are consistent across the app:

```
feature/
  orchestrators/      # container wiring and cross-subdomain state
  shared/             # shared constants/types/hooks for that feature
  domain/             # business logic and feature behavior
    hooks/
    ...               # keep supporting files flat unless multiple files justify a subfolder
  media/              # optional subdomains (e.g. image/video)
    image/
      components/
      ...             # only create subfolders when they contain multiple files
    video/
      components/
      ...
```

Rules:

- Keep `orchestrators/` thin; no heavy business logic.
- Keep rendering in `components/`, behavior in `hooks/`, pure transforms in `view-models/`.
- Put API/protocol code in `services/`; model conversion in `mappers/`.
- Avoid top-level catch-all `utils/` unless scoped under a domain.
- Centralize shared feature contracts in `shared/types.ts` rather than importing types from presentation components.
- Use `index.ts` barrel files at major boundaries (`feature`, `orchestrators`, `shared`, `domain`, `media/*`) for stable imports.
- Prefer this pattern only for complex domains; keep small/simple components flat.
- **Single-file folder rule:** if a folder only contains one non-index file, flatten it (do not keep a dedicated subfolder for one file).
- **Anti-drift rule for feature folders:** keep responsibilities strict and consistent.
  - `orchestrators/`: compose hooks + pass props only; no domain logic.
  - `components/`: presentation/UI only; no server-action calls.
  - `domain/hooks/`: feature behavior and state transitions.
  - `shared/`: feature-local constants/types/shared hooks.
  - External callers should import from the feature boundary (`feature/index.ts`) rather than deep internal files.

### 5. Database Access Consistency

- Use `@db/client` for **all** DB access (web + video-server) to guarantee a single source of schema and Drizzle helpers.
- Refrain from importing `drizzle-orm` helpers directly from node_modules—schema types will mismatch across packages.
- Server actions (web) and services (video-server) must respect project ownership checks already encoded in RLS/policies.

### 6. Docker Build Context

See `apps/video-server/README.md` for video-server deployment and Docker details.

### 7. Next.js Monorepo Configuration

Non-standard config in `next.config.ts`:

- Transpiles workspace packages (`@zencourt/db`, `@zencourt/shared`)
- Externalizes Pino to prevent bundling issues
- Output file tracing includes monorepo root

### 8. Video Server Details

Refer to `apps/video-server/README.md` for video-server specific rendering and queueing behavior.

## Key Files for Understanding the System

1. `packages/db/drizzle/schema.ts` - Complete data model with RLS policies
2. `packages/shared/utils/storagePaths.ts` - Storage architecture (critical!)
3. `packages/shared/types/models/db.asset.ts` - Asset + stage enums shared with frontend.
4. `packages/shared/types/models/db.video.ts` - Video + job type definitions.
5. `apps/video-server/src/services/videoGenerationService.ts` - Core orchestration logic.
6. `apps/web/src/server/actions/db/*.ts` - Server actions wrapping DB access.
7. `apps/web/src/proxy.ts` - Stack Auth validation logic.
8. `tsconfig.base.json` - Monorepo path mappings

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

Web app also has a Jest configuration, but coverage is currently minimal.

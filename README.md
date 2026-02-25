# Zencourt Monorepo

This is a monorepo containing the Zencourt application suite.

## Structure

```
zencourt/
├── apps/
│   ├── web/              # Next.js web client and dashboard
│   └── video-server/     # Express + Remotion backend for video generation
├── packages/
│   ├── db/               # Drizzle schema, migrations, and Neon client helpers
│   └── shared/           # Reusable TypeScript utilities (logger, storage paths, etc.)
├── demo-images/          # Reference assets for marketing/demo flows
├── scripts/              # Deployment and operational helpers
└── package.json          # Root workspace configuration and scripts
```

- `apps` contains the deployable services.
- `packages` hosts shared libraries consumed by the apps.
- `scripts` contains operational helpers (e.g., Hetzner deploy script).

## Architecture Boundaries

- `packages/shared` is app-agnostic and DB-agnostic.
  - Must not import from `@db/*` or `apps/*`.
- `packages/db` is app-agnostic.
  - Must not import from `@web/*`, `@video-server/*`, or `apps/*`.
- DB-inferred model types (`DB*`, `InsertDB*`) live in `@db/types/models`.
- Shared non-DB domain contracts live in `@shared/types/*`.

These package boundaries are enforced with package-local ESLint rules and CI checks.

## Web Workspace Architecture

`apps/web` follows strict layering:

- `app/api/v1/*/route.ts`
  - Parse HTTP input
  - Call `server/actions/*`
  - Shape HTTP responses
  - Must not import models/services directly
- `server/actions/*`
  - Auth/access checks and orchestration
  - Call services/models
  - Must remain HTTP-agnostic
- `server/services/*`
  - Domain/business logic
  - Must not import actions
- `server/models/*`
  - DB access only
- `components/*`
  - UI/presentational-first
  - Must not import server models/services

Import guardrails in `apps/web`:

- Use `@db/client` for Drizzle helpers in app code.
- Do not import `drizzle-orm` directly in app code.
- Use storage path/url helpers from `@shared/utils/storagePaths`.

Source of truth for web architectural rules: `CLAUDE.md` and `apps/web/eslint.config.mjs`.

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Installation

Install all dependencies across all workspaces:

```bash
npm install
```

### Development

Install environment vars locally:

```bash
npm run env:pull
```

#### Community Data Providers

Community category data can be sourced from Google Places (default) or Perplexity.
Configure via environment variables:

- `COMMUNITY_DATA_PROVIDER` = `google` or `perplexity`
- `PERPLEXITY_API_KEY` (required when using Perplexity)
- `PERPLEXITY_MODEL` (optional, defaults to `sonar-pro`)

Run the web app in development mode:

```bash
npm run dev
# or
npm run dev:web
```

Run the video server in development mode:

```bash
npm run dev:video
```

### Building

Build all apps:

```bash
npm run build
```

Build specific apps:

```bash
npm run build:web
npm run build:video
```

### Database Management

Generate database migrations:

```bash
npm run db:generate
```

Run migrations:

```bash
npm run db:migrate
```

Push schema changes:

```bash
npm run db:push
```

Open Drizzle Studio:

```bash
npm run db:studio
```

## License

Private

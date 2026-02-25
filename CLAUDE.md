# CLAUDE.md

Project guidance for coding agents in this monorepo.

## Monorepo Overview

- `apps/web`: Next.js App Router frontend (primary focus for most tasks)
- `apps/video-server`: Express + Remotion backend
- `packages/db`: Drizzle schema/client
- `packages/shared`: shared types/utils

## High-Value Commands

```bash
npm install
npm run dev --workspace=@zencourt/web
npm run type-check --workspace=@zencourt/web
npm run test --workspace=@zencourt/web
npm run test:coverage --workspace=@zencourt/web
```

Database:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
```

## Non-Negotiable Architecture Rules (Web)

### Layering

- `app/api/v1/*/route.ts`
  - Parse HTTP input/params
  - Call `server/actions/*`
  - Shape HTTP responses + error mapping
  - No model or service imports in routes
- `server/actions/*`
  - Auth/access checks
  - Request/domain validation
  - Orchestrate multi-service workflows when a use case spans multiple domains
  - Call services/models
  - No HTTP response objects/status handling
- `server/services/*`
  - Standalone domain modules with their own business logic
  - Avoid direct dependencies on other service modules (shared exceptions: infra/cache and shared config layers).
  - When services call third-party APIs, make sure to keep the service provider-agnostic (see existing marketData or CommunityData services for reference).
- `server/models/*`
  - DB access only
- `components/*`
  - No DB/model imports
  - No server/service imports

### API Route vs Server Action

Use this decision order:

1. Server Component reads (default): read via server actions/services/models.
2. Client mutations (default): call server actions.
3. Create API routes only for:
   - Webhooks/external callbacks
   - Client polling/long-running status
   - SSE/streaming/protocol-specific HTTP behavior
   - Explicit public/cross-app HTTP contracts

Do not add API routes for internal reads/mutations that fit server components/actions.

### Route Dependency Policy

- Default: `route -> action -> service/model`
- Exception: edge/integration endpoints may use `route -> service` when transport behavior is the core concern (e.g. webhook verification).
- Avoid `route -> model`.

## Import/Dependency Guardrails

- Always use `@db/client` for Drizzle helpers (`eq`, `and`, etc.).
- Do not import Drizzle helpers directly from `drizzle-orm` in app code.
- Use shared storage path/url helpers from `@shared/utils/storagePaths`.

## Naming and Organization

### `server/actions` module naming

Preferred files by module:

- `commands.ts`: mutations/side effects
- `queries.ts`: reads
- `index.ts`: boundary exports
- `types.ts`: module-local types
- `helpers.ts`: shared internal helpers (only when needed)

Rules:

- Keep unrelated table/domain concerns in separate modules.
- Prefer module-boundary imports over deep internal paths.

### Large frontend feature structure (when warranted)

```
feature/
  orchestrators/
  components/
  domain/
    hooks/
  shared/
```

- `orchestrators`: composition only
- `components`: presentational UI
- `domain/hooks`: behavior/state transitions
- `shared`: feature-local constants/types

Keep component files exclusively presentational UI. Extract all other logic to domain/hooks or shared (see existing component modules for reference).

## Testing Expectations

- Add/update behavior tests for route/action/service changes.
- Keep route tests focused on route concerns (input parsing, action calls, response shaping).
- Do not add tests that only verify barrel exports.

## Coverage Policy (Web)

Coverage checks are enforced per-module via `apps/web/scripts/check-coverage.mjs`.
When moving or adding modules, keep coverage prefixes in sync.

## Deployment/Infra Notes

- Web deploys via Vercel.
- Video server deploy details: `apps/video-server/README.md`.

## Refactor Philosophy

- Prefer clean breaks over backward-compat shims unless explicitly requested.
- Remove deprecated aliases/exports in the same refactor.

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

- `components/*`
  - Keep components almost exclusively UI/presentational.
  - Move domain logic, types, and constants into `domain/hooks` and helper files within the same component submodule (see existing component module examples for reference).
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
  - When services call third-party APIs, make sure to keep the service provider-agnostic (see existing services for reference).
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

- `route -> action -> service/model`
- Avoid `route -> model` or `route -> service`.

## Import/Dependency Guardrails

- Always use `@db/client` for Drizzle helpers (`eq`, `and`, etc.).
- Do not import Drizzle helpers directly from `drizzle-orm` in app code.
- Use shared storage path/url helpers from `@shared/utils/storagePaths`.

## Naming and Organization

- Keep unrelated table/domain concerns in separate modules.
- Prefer module-boundary imports over deep internal paths.
- Follow existing file/folder naming and structure of adjacent modules at the same layer.
- Prevent putting logic in `index.ts` files. Reserve `index.ts` for barrel exports.

## Testing Expectations

- Add/update behavior tests for route/action/service changes.
- Keep route tests focused on route concerns (input parsing, action calls, response shaping).
- Do not add tests that only verify barrel exports.
- Write unit tests for business/domain logic by default.
- Exemptions (do not require direct unit tests unless requested): `types`, `constants`, pure schema declaration files, and test-only mock/fixture utilities.
- Prefer co-located tests that map directly to a single target file (avoid broad drift where a unit test implicitly validates many unrelated modules).

## Review Workflow Directives

When asked for a review/plan before implementation:

- Review thoroughly before proposing code changes.
- For each issue/recommendation, explain concrete tradeoffs and give an opinionated recommendation.
- Ask for confirmation before assuming direction when multiple valid options exist.

Review in this order:

1. Architecture
   - Boundaries, dependency graph/coupling, data flow, scaling/single points of failure, security boundaries.
2. Code Quality
   - Module organization, DRY violations, error handling/edge cases, technical debt, over/under-engineering.
3. Tests
   - Coverage gaps, assertion quality, missing edge cases, untested failure/error paths.
4. Performance
   - Query/access patterns, memory usage, caching opportunities, high-complexity code paths.

For each issue found:

- Describe the issue concretely with file/line references.
- Present 2-3 options (including “do nothing” where reasonable).
- For each option: implementation effort, risk, blast radius, maintenance impact.
- Provide a recommended option mapped to the stated preferences.
- Pause for user confirmation before proceeding when direction is non-trivial.

Interaction rules:

- Do not assume priority, timeline, or scope.
- After each major section, pause and request feedback before continuing.

## Coverage Policy (Web)

Coverage checks are enforced per-module via `apps/web/scripts/check-coverage.mjs`.
When moving or adding modules, keep coverage prefixes in sync.

## Deployment/Infra Notes

- Web deploys via Vercel.
- Video server deploy details: `apps/video-server/README.md`.

## Refactor Philosophy

- Prefer clean breaks over backward-compat shims unless explicitly requested.
- Remove deprecated aliases/exports in the same refactor.

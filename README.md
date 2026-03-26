# Zencourt Monorepo

This repository contains the Zencourt application suite and the shared project conventions that apply across the monorepo.

## Structure

```text
zencourt/
├── apps/
│   ├── web/              # Next.js web client and dashboard
│   └── video-server/     # Express + Remotion backend for video generation
├── packages/
│   ├── db/               # Drizzle schema, migrations, and Neon client helpers
│   └── shared/           # Reusable TypeScript utilities
├── demo-images/          # Reference assets for marketing/demo flows
├── scripts/              # Deployment and operational helpers
└── package.json          # Root workspace configuration and scripts
```

- `apps` contains the deployable services.
- `packages` contains shared libraries consumed by the apps.
- `scripts` contains operational helpers for local and deployment workflows.

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

## Getting Started

Install workspace dependencies:

```bash
npm install
```

Pull local environment variables:

```bash
npm run env:pull
```

## High-Value Commands

### Development

```bash
npm run dev
npm run dev:web
npm run dev:video
```

### Build

```bash
npm run build
npm run build:web
npm run build:video
```

### Testing and Type Checking

```bash
npm run type-check --workspace=@zencourt/web
npm run test --workspace=@zencourt/web
npm run test:coverage --workspace=@zencourt/web
```

### Database

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
```

## Configuration Notes

### Community Data Providers

Community category data can be sourced from Google Places or Perplexity.

- `COMMUNITY_DATA_PROVIDER`: `google` or `perplexity`
- `PERPLEXITY_API_KEY`: required when using Perplexity
- `PERPLEXITY_MODEL`: optional, defaults to `sonar-pro`

## Architecture Boundaries

### Package Boundaries

- `packages/shared` is app-agnostic and DB-agnostic.
  - Do not import from `@db/*` or `apps/*`.
- `packages/db` is app-agnostic.
  - Do not import from `@web/*`, `@video-server/*`, or `apps/*`.
- DB-inferred model types (`DB*`, `InsertDB*`) belong in `@db/types/models`.
- Shared non-DB domain contracts belong in `@shared/types/*`.

These boundaries are enforced with package-local ESLint rules and CI checks.

### Web Workspace Architecture

`apps/web` follows strict layering:

- `components/*`
  - Keep components primarily UI/presentational.
  - Move domain logic, types, and constants into local `domain/*`, hooks, or helper files in the same module.
  - Do not import DB models or server services.
- `app/api/v1/*/route.ts`
  - Parse HTTP input and params.
  - Call `server/actions/*`.
  - Shape HTTP responses and map errors.
  - Do not import models or services directly.
- `server/actions/*`
  - Perform auth and access checks.
  - Validate request and domain input.
  - Orchestrate multi-service workflows.
  - Call services and models.
  - Remain HTTP-agnostic.
- `server/services/*`
  - Contain standalone domain and business logic.
  - Avoid direct dependencies on other service modules except shared infrastructure layers.
  - Keep third-party integrations provider-agnostic where practical.
- `server/models/*`
  - Handle DB access only.

### API Route vs Server Action

Use this order of preference:

1. Server Component reads by default.
2. Client mutations should call server actions by default.
3. Create API routes only for:
   - Webhooks or external callbacks
   - Client polling or long-running status
   - SSE, streaming, or protocol-specific HTTP behavior
   - Explicit public or cross-app HTTP contracts

Avoid adding API routes for internal reads or mutations that fit server components or server actions.

### Route Dependency Policy

- `route -> action -> service/model`
- Avoid `route -> model`
- Avoid `route -> service`

## Import and Organization Guardrails

- Local modules may maintain their own `README.md` files for module-specific corrections, constraints, and guidance scoped only to that module.
- Before making refactors in a module, review that module's local `README.md` if one exists, and keep it updated when project-specific corrections need to stay scoped to that module.
- If a module-level `README.md` does not exist (and should for future guidance), then make sure to add one.
- Prefer module-boundary imports over deep internal paths.
- Follow adjacent naming and folder conventions.
- Do not put logic in `index.ts`; reserve barrel files for exports.

## Testing Expectations

- Add or update behavior tests for route, action, and service changes.
- Keep route tests focused on route concerns: input parsing, action calls, response shaping.
- Write unit tests for business and domain logic by default.
- Do not add tests that only verify barrel exports.
- Exemptions unless explicitly requested:
  - `types`
  - `constants`
  - pure schema declaration files
  - test-only fixtures and mocks
- Prefer co-located tests that map directly to one target file.

## Coverage Policy

Coverage checks for `apps/web` are enforced per module via `apps/web/scripts/check-coverage.mjs`.
When moving or adding modules, keep coverage prefixes in sync.

## Deployment Notes

- Web deploys via Vercel.
- Video server deployment details live in `apps/video-server/README.md`.

## Refactor Philosophy

- Prefer clean breaks over backward-compatibility shims unless explicitly requested otherwise.
- Remove deprecated aliases and exports in the same refactor.
- After any significant code change, run the build, test, check-coverage and lint npm scripts to make sure no regressions occured.

## Agent References

- [AGENTS.md](./AGENTS.md)
- [CLAUDE.md](./CLAUDE.md)
- [DIRECTIVES.md](./DIRECTIVES.md)

## License

Private

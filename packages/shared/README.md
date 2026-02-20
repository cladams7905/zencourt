# @zencourt/shared

Shared contracts and runtime-safe utilities used by both web and video-server.

## Ownership

- Put cross-workspace types here (`types/`) when they are not DB-inferred.
- Put pure utilities here (`utils/`) with no app/runtime side effects.
- Keep this package framework-agnostic and app-agnostic.

## Forbidden Imports

- Do not import from `@db/*` or `packages/db/*`.
- Do not import from `apps/*`.

These boundaries are enforced via `packages/shared/eslint.config.mjs`.

## Public Surface

- Use stable boundaries:
  - `@shared/types/*`
  - `@shared/utils`
  - `@shared/utils/storagePaths`
  - `@shared/utils/textOverlay`

Avoid deep imports unless extending internals in this package.

## Testing

- Run:
  - `npm run lint:shared`
  - `npm run type-check:shared`
  - `npm run test:shared`

Core tests currently cover storage config/path behavior and text overlay utilities.

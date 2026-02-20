# @zencourt/db

Database schema, migrations, Drizzle client, and DB-owned model types.

## Ownership

- `drizzle/schema/*`: table and enum definitions.
- `drizzle/migrations/*`: generated migration history.
- `client.ts`: shared Drizzle client entrypoint for all workspaces.
- `types/models.ts`: DB-inferred model types and enum unions.

## Forbidden Imports

- Do not import from `@web/*` or `@video-server/*`.
- Do not import from `apps/*`.

These boundaries are enforced via `packages/db/eslint.config.mjs`.

## Migration Workflow

- Generate and apply with workspace scripts only:
  - `npm run db:generate`
  - `npm run db:migrate`
  - `npm run db:push`
- Do not hand-author migration SQL unless explicitly required.

## Type Ownership Rule

- DB-inferred types (`DB*`, `InsertDB*`, DB enum unions) belong in `@db/types/models`.
- Shared non-DB domain contracts belong in `@shared/types/*`.

## Validation

- Run:
  - `npm run lint:db`
  - `npm run type-check:db`
  - `npm run test:db`

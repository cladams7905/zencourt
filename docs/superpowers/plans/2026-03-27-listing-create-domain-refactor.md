# Listing Create Domain Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `apps/web/src/components/listings/create/domain` into clear `llistingContent` and `listingClipManager` submodules, adopt simpler filenames like `effects.ts`, and standardize imports through barrel `index.ts` files.

**Architecture:** Keep `components` presentational and preserve the current workflow/container boundary. Move domain files into feature-scoped folders, add nested barrel exports for public entrypoints only, and rename files to responsibility-first names rather than `useListingContent*`/`useListingClipManager*` prefixes where the folder already provides context.

**Tech Stack:** Next.js client components, React hooks, TypeScript, Jest

---

## Target Structure

### `apps/web/src/components/listings/create/domain/llistingContent`

- `index.ts`
- `workflow.ts`
- `effects.ts`
- `activeMediaItems.ts`
- `mediaItems.ts`
- `previewPlans.ts`
- `deleteCachedPreviewItem.ts`
- `queryParams.ts`
- `utils.ts`
- `previewTimeline.ts`
- `contentGeneration/`
- `templateRender/`
- `__tests__/`

### `apps/web/src/components/listings/create/domain/listingClipManager`

- `index.ts`
- `workspace.ts`
- `actions.ts`
- `sync.ts`
- `helpers.ts`
- `regenerationState.ts`
- `__tests__/`

### Domain Root

- Keep a root `index.ts` that re-exports only the public module barrels:
  - `./llistingContent`
  - `./listingClipManager`

## Rename Map

- `useListingContentWorkflow.ts` -> `llistingContent/workflow.ts`
- `useListingContentEffects.ts` -> `llistingContent/effects.ts`
- `useListingContentActiveMediaItems.ts` -> `llistingContent/activeMediaItems.ts`
- `useListingContentMediaItems.ts` -> `llistingContent/mediaItems.ts`
- `useListingContentPreviewPlans.ts` -> `llistingContent/previewPlans.ts`
- `useDeleteCachedPreviewItem.ts` -> `llistingContent/deleteCachedPreviewItem.ts`
- `llistingContentQueryParams.ts` -> `llistingContent/queryParams.ts`
- `llistingContentUtils.ts` -> `llistingContent/utils.ts`
- `previewTimeline.ts` -> `llistingContent/previewTimeline.ts`
- `useListingClipManagerWorkspace.ts` -> `listingClipManager/workspace.ts`
- `useListingClipManagerWorkspaceActions.ts` -> `listingClipManager/actions.ts`
- `useListingClipManagerWorkspaceSync.ts` -> `listingClipManager/sync.ts`
- `listingClipManagerWorkspaceHelpers.ts` -> `listingClipManager/helpers.ts`
- `listingClipRegenerationState.ts` -> `listingClipManager/regenerationState.ts`

## Export Policy

- Every feature folder gets an `index.ts`.
- Use folder-local imports inside each feature where practical.
- External consumers should import from:
  - `@web/src/components/listings/create/domain/llistingContent`
  - `@web/src/components/listings/create/domain/listingClipManager`
  - or the root domain barrel if the repo still prefers a single top-level entrypoint.
- Do not keep compatibility re-export shims with old filenames unless an incremental migration is required for CI stability.

## Findings

## `apps/web/src/components/listings/create/domain/index.ts`: SRP – flat domain barrel hides two separate feature modules

**Issue:** The root barrel currently mixes listing create workflow exports with clip manager exports and lower-level utilities in one namespace.

**Location:** `index.ts`

**Recommendation:** Replace the flat export list with two explicit feature barrels: `llistingContent/index.ts` and `listingClipManager/index.ts`, then keep the root barrel minimal.

**Priority:** 🔴 High

## `apps/web/src/components/listings/create/domain/useListingContentWorkflow.ts`: Code smell – feature workflow depends on many sibling files with naming noise

**Issue:** The current workflow file imports several sibling `useListingContent*` files that are already context-qualified by folder path, which makes filenames long and obscures the actual module boundaries.

**Location:** `useListingContentWorkflow`

**Recommendation:** Move workflow-related files into `llistingContent/` and rename them to `workflow`, `effects`, `activeMediaItems`, `mediaItems`, and `previewPlans`.

**Priority:** 🔴 High

## `apps/web/src/components/listings/create/domain/useListingClipManagerWorkspace.ts`: Code smell – clip manager workflow is now modular internally but still leaked across the root domain namespace

**Issue:** `workspace`, `actions`, `sync`, `helpers`, and `regenerationState` belong to one feature but are still rooted directly under `domain/`.

**Location:** clip manager workflow files

**Recommendation:** Move them into `listingClipManager/` with a dedicated barrel and aligned test folder.

**Priority:** 🔴 High

## `apps/web/src/components/listings/create/domain/__tests__`: Code smell – root test folder no longer matches feature boundaries

**Issue:** Tests for query params, utils, preview plans, effects, and clip regeneration are all co-located under one root test folder even though the source is now feature-shaped.

**Location:** `domain/__tests__`

**Recommendation:** Move tests under `llistingContent/__tests__` and `listingClipManager/__tests__` so source and test boundaries stay aligned.

**Priority:** 🟡 Medium

## Implementation Order

1. Create the new folders and barrel files.
2. Move and rename `llistingContent` files.
3. Move and rename `listingClipManager` files.
4. Update imports in consumers and tests to use the new barrels.
5. Move tests to match the new folders.
6. Run targeted tests, then full web type-check.

### Task 1: Create Feature Folders And Barrels

**Files:**

- Create: `apps/web/src/components/listings/create/domain/llistingContent/index.ts`
- Create: `apps/web/src/components/listings/create/domain/listingClipManager/index.ts`
- Modify: `apps/web/src/components/listings/create/domain/index.ts`

- [ ] Create `llistingContent/` and `listingClipManager/` folders.
- [ ] Add `llistingContent/index.ts` exporting `workflow`, `effects`, `activeMediaItems`, `mediaItems`, `previewPlans`, `deleteCachedPreviewItem`, `queryParams`, `utils`, `previewTimeline`, `contentGeneration`, and `templateRender`.
- [ ] Add `listingClipManager/index.ts` exporting `workspace`, `actions`, `sync`, `helpers`, and `regenerationState`.
- [ ] Reduce the root barrel to feature-level re-exports only.
- [ ] Run `npm run type-check --workspace=@zencourt/web` and fix any barrel cycles immediately before moving on.

### Task 2: Move And Rename Listing Create Files

**Files:**

- Move: `apps/web/src/components/listings/create/domain/useListingContentWorkflow.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/workflow.ts`
- Move: `apps/web/src/components/listings/create/domain/useListingContentEffects.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/effects.ts`
- Move: `apps/web/src/components/listings/create/domain/useListingContentActiveMediaItems.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/activeMediaItems.ts`
- Move: `apps/web/src/components/listings/create/domain/useListingContentMediaItems.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/mediaItems.ts`
- Move: `apps/web/src/components/listings/create/domain/useListingContentPreviewPlans.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/previewPlans.ts`
- Move: `apps/web/src/components/listings/create/domain/useDeleteCachedPreviewItem.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/deleteCachedPreviewItem.ts`
- Move: `apps/web/src/components/listings/create/domain/llistingContentQueryParams.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/queryParams.ts`
- Move: `apps/web/src/components/listings/create/domain/llistingContentUtils.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/utils.ts`
- Move: `apps/web/src/components/listings/create/domain/previewTimeline.ts` -> `apps/web/src/components/listings/create/domain/llistingContent/previewTimeline.ts`
- Move: `apps/web/src/components/listings/create/domain/contentGeneration/*` -> `apps/web/src/components/listings/create/domain/llistingContent/contentGeneration/*`
- Move: `apps/web/src/components/listings/create/domain/templateRender/*` -> `apps/web/src/components/listings/create/domain/llistingContent/templateRender/*`

- [ ] Move each file without changing behavior.
- [ ] Update relative imports within `llistingContent/` to use local paths.
- [ ] Update consumers to import from `domain/llistingContent` or the root barrel rather than legacy file paths.
- [ ] Remove old file-path references rather than leaving duplicate aliases.
- [ ] Run these tests:
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/__tests__/useListingContentActiveMediaItems.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/__tests__/useListingContentEffects.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/__tests__/useListingContentMediaItems.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/__tests__/useListingContentPreviewPlans.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/contentGeneration/__tests__/useContentGeneration.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/templateRender/__tests__/useTemplateRender.test.tsx`

### Task 3: Move And Rename Listing Clip Manager Files

**Files:**

- Move: `apps/web/src/components/listings/create/domain/useListingClipManagerWorkspace.ts` -> `apps/web/src/components/listings/create/domain/listingClipManager/workspace.ts`
- Move: `apps/web/src/components/listings/create/domain/useListingClipManagerWorkspaceActions.ts` -> `apps/web/src/components/listings/create/domain/listingClipManager/actions.ts`
- Move: `apps/web/src/components/listings/create/domain/useListingClipManagerWorkspaceSync.ts` -> `apps/web/src/components/listings/create/domain/listingClipManager/sync.ts`
- Move: `apps/web/src/components/listings/create/domain/listingClipManagerWorkspaceHelpers.ts` -> `apps/web/src/components/listings/create/domain/listingClipManager/helpers.ts`
- Move: `apps/web/src/components/listings/create/domain/listingClipRegenerationState.ts` -> `apps/web/src/components/listings/create/domain/listingClipManager/regenerationState.ts`

- [ ] Move and rename the clip manager files as a single batch.
- [ ] Update `ListingClipManager.tsx` and related tests to import from `domain/listingClipManager`.
- [ ] Keep `workspace.ts` as the public facade and preserve the existing sync/actions/helper split.
- [ ] Run these tests:
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/components/__tests__/ListingClipManager.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/components/__tests__/ListingClipManagerWorkspaceParts.test.tsx`
  - `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/__tests__/listingClipRegenerationState.test.ts`

### Task 4: Move Tests To Match Feature Folders

**Files:**

- Move: `apps/web/src/components/listings/create/domain/__tests__/llistingContentQueryParams.test.ts`
- Move: `apps/web/src/components/listings/create/domain/__tests__/llistingContentUtils.test.ts`
- Move: `apps/web/src/components/listings/create/domain/__tests__/previewTimeline.test.ts`
- Move: `apps/web/src/components/listings/create/domain/__tests__/useDeleteCachedPreviewItem.test.tsx`
- Move: `apps/web/src/components/listings/create/domain/__tests__/useListingContentActiveMediaItems.test.tsx`
- Move: `apps/web/src/components/listings/create/domain/__tests__/useListingContentEffects.test.tsx`
- Move: `apps/web/src/components/listings/create/domain/__tests__/useListingContentMediaItems.test.tsx`
- Move: `apps/web/src/components/listings/create/domain/__tests__/useListingContentPreviewPlans.test.tsx`
- Move: `apps/web/src/components/listings/create/domain/__tests__/listingClipRegenerationState.test.ts`

- [ ] Move `llistingContent` tests under `apps/web/src/components/listings/create/domain/llistingContent/__tests__/`.
- [ ] Move clip manager tests under `apps/web/src/components/listings/create/domain/listingClipManager/__tests__/`.
- [ ] Update import paths to prefer local feature barrels or local sibling files.
- [ ] Run the moved tests by their new paths and verify Jest config still resolves them.

### Task 5: Clean Consumer Imports

**Files:**

- Modify any files under `apps/web/src/components/listings/create/components/`
- Modify any files under `apps/web/src/components/listings/create/media/`
- Modify any files under `apps/web/src/app/` or `apps/web/src/server/` that import domain files directly

- [ ] Replace legacy direct-file imports with `llistingContent` and `listingClipManager` barrel imports.
- [ ] Normalize internal same-feature imports to use nearby relative paths instead of reaching back through the old root domain structure.
- [ ] Remove all remaining `useListingContent*` and `useListingClipManager*` filename references from import specifiers except for exported hook/function symbols that intentionally keep those names.
- [ ] Run `rg "useListingContent|useListingClipManager|llistingContentUtils|llistingContentQueryParams|previewTimeline"` across `apps/web/src/components/listings/create` to confirm no stale file-path references remain.

### Task 6: Final Verification And Cleanup

**Files:**

- Modify: `apps/web/src/components/listings/create/domain/index.ts`
- Modify: `apps/web/src/components/listings/create/domain/llistingContent/index.ts`
- Modify: `apps/web/src/components/listings/create/domain/listingClipManager/index.ts`

- [ ] Run targeted Jest suites for listing create and clip manager.
- [ ] Run `npm run type-check --workspace=@zencourt/web`.
- [ ] Run `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/components/__tests__/ListingClipManager.test.tsx`.
- [ ] Run `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/llistingContent/__tests__/...` for the moved listing create tests.
- [ ] Remove any empty legacy folders after confirming no imports depend on them.

## Risks And Guardrails

- Barrel files can hide cycles. Keep barrels shallow and avoid having implementation files import from their own feature barrel.
- Renames will break tests and consumers quickly. Move one feature at a time and keep typecheck green between phases.
- Do not rename exported hook symbols unless there is a strong reason. The plan only simplifies filenames and module paths, not public API names.
- Do not leave compatibility shim files behind unless CI requires a temporary bridge.

## Suggested Commit Order

1. `refactor: add listing create and clip manager domain barrels`
2. `refactor: move listing create domain modules into subfolder`
3. `refactor: move listing clip manager domain modules into subfolder`
4. `test: move listing create and clip manager domain tests`
5. `refactor: normalize listing create domain imports`

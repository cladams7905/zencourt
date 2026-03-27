# useContentGeneration Decomposition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `useContentGeneration` into folder-private pure helpers and focused internal hooks without changing its public behavior or return contract.

**Architecture:** Keep `useContentGeneration` as the only public entrypoint and move pure state transitions, bucket/paging orchestration, stream lifecycle, and warmup orchestration into separate internal modules. Preserve behavior by adding tests before each extraction step and keeping the existing hook tests green throughout the refactor.

**Tech Stack:** TypeScript, React hooks, Jest, Testing Library

---

## File Structure

- Create: `apps/web/src/components/listings/create/domain/content/generation/stateTransitions.ts`
  Responsibility: Pure bucket and cross-bucket state updates with no React or async behavior.
- Create: `apps/web/src/components/listings/create/domain/content/generation/useListingContentBuckets.ts`
  Responsibility: Bucket state ownership, request-version guards, initial reset/sync, active-filter first-page fetch, and load-more orchestration.
- Create: `apps/web/src/components/listings/create/domain/content/generation/useListingContentStreamGeneration.ts`
  Responsibility: Stream refs, generation state, SSE handling, and `generateSubcategoryContent`.
- Create: `apps/web/src/components/listings/create/domain/content/generation/useListingContentWarmup.ts`
  Responsibility: Sibling warmup and opposite-media deferred prefetch behavior.
- Modify: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts`
  Responsibility: Compose internal hooks, expose the unchanged public contract, compute derived values.
- Create: `apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
  Responsibility: Direct unit coverage for pure state transitions.
- Modify: `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
  Responsibility: Preserve current coverage and add one contract-style test for return shape plus representative transitions.

### Task 1: Add Failing Tests For Pure State Transitions

**Files:**
- Create: `apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
- Reference: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts`
- Reference: `apps/web/src/components/listings/create/domain/content/generation/../items/filterBuckets.ts`

- [ ] **Step 1: Write the failing test**

```ts
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { getEmptyBucket, type FilterBuckets } from "../../items/filterBuckets";
import {
  appendPageItems,
  removeBatchItemsFromBucket,
  removeContentItemFromBuckets,
  replaceContentItemInBuckets,
  settleBucketItems
} from "../stateTransitions";

describe("contentGeneration/stateTransitions", () => {
  it("settles a bucket and resets loading state", () => {
    const bucket = {
      ...getEmptyBucket(),
      isLoadingInitialPage: true,
      isLoadingMore: true,
      hasFetchedInitialPage: false,
      items: [{ id: "old-1" } as ContentItem]
    };

    expect(settleBucketItems(bucket, [{ id: "new-1" } as ContentItem])).toEqual({
      ...bucket,
      items: [{ id: "new-1" }],
      isLoadingInitialPage: false,
      isLoadingMore: false,
      hasFetchedInitialPage: true,
      offset: 1,
      loadedCount: 1
    });
  });

  it("removes batch items and updates counts", () => {
    const bucket = {
      ...getEmptyBucket(),
      items: [{ id: "batch-1" }, { id: "keep-1" }, { id: "batch-2" }] as ContentItem[],
      loadedCount: 3
    };

    expect(removeBatchItemsFromBucket(bucket, ["batch-1", "batch-2"])).toMatchObject({
      items: [{ id: "keep-1" }],
      loadedCount: 1
    });
  });

  it("appends only new page items and advances paging metadata", () => {
    const bucket = {
      ...getEmptyBucket(),
      items: [{ id: "keep-1" }, { id: "keep-2" }] as ContentItem[],
      isLoadingMore: true
    };

    expect(
      appendPageItems(bucket, {
        items: [{ id: "keep-2" }, { id: "new-1" }] as ContentItem[],
        hasMore: true,
        nextOffset: 3
      })
    ).toMatchObject({
      items: [{ id: "keep-1" }, { id: "keep-2" }, { id: "new-1" }],
      isLoadingMore: false,
      hasMore: true,
      offset: 3,
      loadedCount: 3
    });
  });

  it("removes a content item across all buckets", () => {
    const buckets: FilterBuckets = {
      first: {
        ...getEmptyBucket(),
        items: [{ id: "remove-me" }, { id: "keep-1" }] as ContentItem[],
        loadedCount: 2
      },
      second: {
        ...getEmptyBucket(),
        items: [{ id: "keep-2" }, { id: "remove-me" }] as ContentItem[],
        loadedCount: 2
      }
    };

    expect(removeContentItemFromBuckets(buckets, "remove-me")).toEqual({
      first: expect.objectContaining({
        items: [{ id: "keep-1" }],
        loadedCount: 1
      }),
      second: expect.objectContaining({
        items: [{ id: "keep-2" }],
        loadedCount: 1
      })
    });
  });

  it("replaces a content item across all buckets", () => {
    const buckets: FilterBuckets = {
      first: {
        ...getEmptyBucket(),
        items: [{ id: "old-1", hook: "old" }] as ContentItem[],
        loadedCount: 1
      },
      second: {
        ...getEmptyBucket(),
        items: [{ id: "keep-1" }, { id: "old-1", hook: "old" }] as ContentItem[],
        loadedCount: 2
      }
    };

    expect(
      replaceContentItemInBuckets(buckets, {
        previousContentItemId: "old-1",
        nextItem: { id: "new-1", hook: "new" } as ContentItem
      })
    ).toEqual({
      first: expect.objectContaining({
        items: [{ id: "new-1", hook: "new" }],
        loadedCount: 1
      }),
      second: expect.objectContaining({
        items: [{ id: "keep-1" }, { id: "new-1", hook: "new" }],
        loadedCount: 2
      })
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
Expected: FAIL because `stateTransitions.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `stateTransitions.ts` with pure exported helpers that move the current in-hook logic for:

- settling bucket items
- removing current batch items from a bucket
- appending deduped page items
- removing an item across all buckets
- replacing an item across all buckets

Use existing `FilterBucket`, `FilterBuckets`, and `ListingContentItem` types. Keep behavior byte-for-byte equivalent where practical.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/domain/content/generation/stateTransitions.ts apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts
git commit -m "test: cover content generation state transitions"
```

### Task 2: Extract Bucket And Paging Orchestration

**Files:**
- Create: `apps/web/src/components/listings/create/domain/content/generation/useListingContentBuckets.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a hook test that proves the active filter auto-fetches its first page when switching to an unfetched bucket and that stale listing resets do not erase unrelated bucket state during initial-bucket sync.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
Expected: FAIL on the new bucket/paging assertions before extraction work is complete.

- [ ] **Step 3: Write minimal implementation**

Create `useListingContentBuckets.ts` and move:

- `filterBuckets` state and ref
- `updateBucket`
- listing request version tracking
- listing reset effect
- initial bucket server-revision sync effect
- `fetchFirstPageForFilter`
- active-filter auto-fetch effect
- `loadMoreForActiveFilter`

Return the current bucket and callbacks needed by the shell. Update `useContentGeneration.ts` to use the extracted hook while preserving public behavior.

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/domain/content/generation/useListingContentBuckets.ts apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx
git commit -m "refactor: extract content generation bucket state"
```

### Task 3: Extract Stream Lifecycle

**Files:**
- Create: `apps/web/src/components/listings/create/domain/content/generation/useListingContentStreamGeneration.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`

- [ ] **Step 1: Write the failing test**

Add or extend a hook test that proves generation still removes streamed batch items on abort and preserves partial-done retry behavior after the extraction.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
Expected: FAIL on the new generation-lifecycle assertion before extraction work is complete.

- [ ] **Step 3: Write minimal implementation**

Create `useListingContentStreamGeneration.ts` and move:

- stream refs
- generation state
- `generateSubcategoryContent`
- loading count derivation tied to active generation count and incomplete skeleton count

Inject bucket update callbacks instead of owning bucket state directly. Preserve SSE parsing, toasts, abort handling, and preview-plan enrichment unchanged.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/domain/content/generation/useListingContentStreamGeneration.ts apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx
git commit -m "refactor: extract content generation stream lifecycle"
```

### Task 4: Extract Warmup Orchestration

**Files:**
- Create: `apps/web/src/components/listings/create/domain/content/generation/useListingContentWarmup.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a hook test that proves sibling warmup runs before opposite-media warmup for an unfetched active context, using the existing page-fetch mock to observe call ordering.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
Expected: FAIL on the warmup ordering assertion before extraction work is complete.

- [ ] **Step 3: Write minimal implementation**

Create `useListingContentWarmup.ts` with the same effect semantics:

- warm sibling subcategories first for the active media tab
- schedule opposite-media warmup in `setTimeout(..., 0)`
- preserve local cancellation behavior

Update the shell to call the new hook.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/domain/content/generation/useListingContentWarmup.ts apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx
git commit -m "refactor: extract content generation warmup flow"
```

### Task 5: Reduce useContentGeneration To A Thin Shell

**Files:**
- Modify: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/index.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a contract-style test that asserts the hook still returns the same public keys and supports a representative generation path and paging path through the composed shell.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
Expected: FAIL on the new contract assertions before the shell is finalized.

- [ ] **Step 3: Write minimal implementation**

Finalize `useContentGeneration.ts` so it:

- derives filter keys
- composes the bucket hook, stream hook, and warmup hook
- exposes `removeContentItem` and `replaceContentItem` via `stateTransitions.ts`
- computes `initialPageLoadingCount` and `loadingMoreCount`
- preserves the return contract exactly

Do not export any new internal helpers from `index.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run:
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stream.test.ts`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/mappers.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts apps/web/src/components/listings/create/domain/content/generation/index.ts apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts
git commit -m "refactor: compose content generation hook internals"
```

### Task 6: Final Verification

**Files:**
- Verify only

- [ ] **Step 1: Run focused generation test suite**

Run:
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/stream.test.ts`
- `npm test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/mappers.test.ts`

Expected: PASS

- [ ] **Step 2: Run related web test command**

Run: `npm test --workspace=@zencourt/web -- --runInBand listings/create/domain/content`
Expected: PASS, or report exact failing tests if the command pattern is not supported by the repo runner.

- [ ] **Step 3: Run type-check for the web workspace**

Run: `npm run type-check --workspace=@zencourt/web`
Expected: PASS

- [ ] **Step 4: Run lint for the web workspace**

Run: `npm run lint --workspace=@zencourt/web -- apps/web/src/components/listings/create/domain/content/generation`
Expected: PASS, or report if the workspace lint command does not accept a path filter and rerun `npm run lint --workspace=@zencourt/web`.

- [ ] **Step 5: Run the web build**

Run: `npm run build --workspace=@zencourt/web`
Expected: PASS

- [ ] **Step 6: Run coverage checks**

Run: `npm run check-coverage --workspace=@zencourt/web`
Expected: PASS

- [ ] **Step 7: Inspect git diff**

Run: `git status --short`
Expected: Only intended generation-folder and plan/spec documentation changes are present, plus any unrelated pre-existing user changes.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/listings/create/domain/content/generation docs/superpowers/plans/2026-03-27-use-content-generation-decomposition.md
git commit -m "refactor: decompose useContentGeneration"
```

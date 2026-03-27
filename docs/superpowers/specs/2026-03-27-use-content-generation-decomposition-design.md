# useContentGeneration Decomposition Design

## Summary

Refactor `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts` into smaller folder-private units without changing runtime behavior, public API, or event sequencing.

The existing hook currently owns four distinct concerns:

- pure bucket and cross-bucket state transitions
- paged bucket fetching and load-more orchestration
- streaming generation lifecycle and SSE handling
- warmup and prefetch scheduling

The refactor will preserve `useContentGeneration` as the only public entrypoint and keep all new modules private to the `generation/` folder.

## Goals

- Reduce the size and responsibility count of `useContentGeneration.ts`.
- Make state transitions testable without rendering the hook.
- Isolate paging, streaming, and warmup behavior behind focused internal hooks.
- Preserve the current return contract of `useContentGeneration` exactly.
- Preserve existing behavior for aborts, toasts, partial generations, request-version guards, warmup ordering, and video preview-plan enrichment.

## Non-Goals

- No behavior changes or API changes.
- No new exports from `apps/web/src/components/listings/create/domain/content/generation/index.ts`.
- No cleanup of SSE payload semantics, toast copy, or warmup strategy in this refactor.
- No architectural changes outside the `generation/` folder.

## Current Problems

The current hook mixes state mutation helpers, refs, async fetch orchestration, streaming logic, warmup scheduling, and final derived return values in one file. That makes it hard to:

- test state transitions in isolation
- reason about abort and request-version behavior
- change one workflow without scanning unrelated logic
- verify which code is responsible for a given bucket update

## Proposed Structure

### 1. `stateTransitions.ts`

Add a pure helper module in `apps/web/src/components/listings/create/domain/content/generation/stateTransitions.ts`.

Responsibilities:

- settle a bucket after stream completion or initial replacement
- remove current batch items from a bucket
- append paged results while deduplicating by item id
- remove a content item across all buckets
- replace a content item across all buckets

Constraints:

- pure functions only
- no React imports
- no network, timers, refs, or toasts

### 2. `useListingContentBuckets.ts`

Add an internal hook in `apps/web/src/components/listings/create/domain/content/generation/useListingContentBuckets.ts`.

Responsibilities:

- own `filterBuckets` state
- own `filterBucketsRef`
- own `updateBucket`
- own request-version state and guards
- own the full listing reset path when listing identity or initial server filter identity changes
- own the separate initial-bucket server sync path when the server-backed item revision changes
- own `fetchFirstPageForFilter`
- own the active-filter auto-fetch effect that requests the first page when the current bucket has neither fetched nor started loading
- own `loadMoreForActiveFilter`
- expose active bucket selectors and bucket-derived loading state

Inputs:

- listing identity and server content inputs
- current active media tab and subcategory
- generation state needed to guard load-more while generating

Outputs:

- `filterBuckets`
- `currentBucket`
- `updateBucket`
- `fetchFirstPageForFilter`
- `loadMoreForActiveFilter`
- `isCurrentListingRequestVersion`

Behavior to preserve:

- initial bucket comes from server data for the initial filter
- request-version invalidates stale async fetches
- listing resets clear warmup state, abort stale fetches, and rebuild bucket state from the server-backed initial filter
- server revision sync only refreshes the initial server-backed bucket and does not collapse the rest of the local bucket map
- active-filter auto-fetch still hydrates the visible bucket on mount and when active filter changes to an unfetched bucket
- warmup fetches are deduplicated through the in-flight map
- load-more remains blocked while the active filter is generating
- failure to load more still resets `isLoadingMore` and shows the same toast

### 3. `useListingContentStreamGeneration.ts`

Add an internal hook in `apps/web/src/components/listings/create/domain/content/generation/useListingContentStreamGeneration.ts`.

Responsibilities:

- own stream lifecycle refs:
  - controller
  - stream buffer
  - parsed items
  - active batch id
  - active batch item ids
  - active generation count
  - active cache key timestamp
  - active generating filter key
- own `isGenerating`
- own `generationError`
- own incomplete skeleton count
- implement `generateSubcategoryContent`

Inputs:

- listing id
- active media tab
- listing clip items
- bucket update callback

Outputs:

- `generateSubcategoryContent`
- `isGenerating`
- `generationError`
- `loadingCount`
- `activeGeneratingFilterKeyRef`
- cancellation/reset behavior needed by the shell or bucket hook

Behavior to preserve:

- abort previous active request before starting a new one
- stream event handling remains unchanged
- partial `done` payloads still set retryable error state and toast
- stream termination without `done` still becomes an error
- abort errors still remove active batch items without surfacing an error
- final video items still receive preview-plan-derived clip ordering when missing

### 4. `useListingContentWarmup.ts`

Add an internal hook in `apps/web/src/components/listings/create/domain/content/generation/useListingContentWarmup.ts`.

Responsibilities:

- warm current-media sibling subcategories first
- defer opposite-media warmup until sibling warmup resolves
- preserve existing cancellation semantics inside the effect

Inputs:

- active media tab
- active subcategory
- listing id
- `fetchFirstPageForFilter`

Behavior to preserve:

- same warmup sequencing
- same zero-delay deferral for opposite-media warmup
- same local cancellation behavior on dependency changes or unmount

### 5. `useContentGeneration.ts`

Reduce the existing file to a composition shell.

Responsibilities after refactor:

- derive `initialServerFilterKey` and `currentFilterKey`
- compose bucket, stream, and warmup hooks
- wire stream callbacks into bucket updates
- keep cross-bucket mutations exposed as public callbacks
- compute final return values and preserve the public contract exactly

The returned object must remain:

- `bucketContentItems`
- `isGenerating`
- `generationError`
- `loadingCount`
- `initialPageLoadingCount`
- `loadingMoreCount`
- `hasMoreForActiveFilter`
- `generateSubcategoryContent`
- `removeContentItem`
- `loadMoreForActiveFilter`
- `replaceContentItem`

## Testing Strategy

### Existing Coverage Baseline

Keep existing tests in `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx` passing unchanged as the main behavioral regression suite.

### New Tests

Add unit tests for `stateTransitions.ts` covering:

- settled bucket state normalization
- removal of current batch items
- page append deduplication and count updates
- cross-bucket item removal
- cross-bucket item replacement

Add one contract-style hook test after composition is complete covering:

- stable return shape
- one representative generation transition
- one representative paging transition

The new contract test should stay high-level and avoid over-specifying implementation details.

## Implementation Phases

### Phase 1: Pure Transition Extraction

- create `stateTransitions.ts`
- move pure bucket and cross-bucket mutation logic there
- add focused unit tests

### Phase 2: Bucket and Paging Extraction

- create `useListingContentBuckets.ts`
- move bucket state ownership, request-version tracking, initial sync, first-page fetch, and load-more there
- keep existing `useContentGeneration` tests green

### Phase 3: Stream Lifecycle Extraction

- create `useListingContentStreamGeneration.ts`
- move stream refs and `generateSubcategoryContent` there
- preserve event handling exactly

### Phase 4: Warmup Extraction

- create `useListingContentWarmup.ts`
- move sibling and opposite-media warmup orchestration there

### Phase 5: Composition Shell

- reduce `useContentGeneration.ts` to composition and derived values
- preserve public return contract 1:1

### Phase 6: Hardening

- add a small contract test
- run the relevant listing-create domain tests

## Risks and Mitigations

### Risk: Behavioral drift during extraction

Mitigation:

- keep the public hook tests unchanged while refactoring internals
- avoid semantic cleanup during the split
- move pure helpers first, then async orchestration second

### Risk: Incorrect ownership boundaries between bucket and stream hooks

Mitigation:

- bucket hook owns persistent bucket state and request-version rules
- stream hook only requests bucket updates through injected callbacks
- shell remains the only place where top-level composition knowledge is needed

### Risk: Warmup behavior changes subtly

Mitigation:

- keep warmup extraction last among internal hooks
- preserve the same `setTimeout(..., 0)` sequencing and local cancellation flag

## Acceptance Criteria

- `useContentGeneration` remains the only public export used by consumers.
- No consumer changes are required.
- Existing generation behavior remains unchanged.
- New helper tests cover pure transition logic directly.
- The hook file becomes a thin orchestration shell with focused internals moved to separate files.

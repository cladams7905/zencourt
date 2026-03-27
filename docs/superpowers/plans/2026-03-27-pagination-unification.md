# Pagination Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize shared pagination page types and client infinite-scroll behavior across My Listings, listing-create content, and reel picker without changing the underlying server pagination strategies or regressing SSR/hydration.

**Architecture:** Keep offset and cursor pagination as explicit transport variants at the server boundary, introduce shared `OffsetPage<T>` and `CursorPage<T>` contracts in a domain-level location, and extract one reusable SWR-infinite client primitive for paged server data. My Listings keeps its current API response shape initially and maps to the shared offset contract at the client/service edge; Media Library remains separate because it reveals already-loaded data instead of fetching pages.

**Tech Stack:** Next.js, React, SWR, TypeScript, Jest, Testing Library

---

### Task 1: Add Shared Pagination Contracts

**Files:**
- Create: `apps/web/src/lib/domain/pagination/types.ts`
- Create: `apps/web/src/lib/domain/pagination/index.ts`
- Modify: `apps/web/src/components/listings/create/domain/content/items/client.ts`
- Modify: `apps/web/src/server/actions/media/commands.ts`
- Modify: `apps/web/src/components/listings/myListings/domain/services/listingsService.ts`
- Test: `apps/web/src/server/actions/media/__tests__/commands.test.ts`
- Test: `apps/web/src/server/actions/listings/content/items/__tests__/queries.test.ts`

- [ ] **Step 1: Write or update failing type-level usage points**

Target updates:
- `ListingContentItemsPage` should be replaced by a shared `OffsetPage<ContentItem>` alias or direct import.
- `UserMediaReelPickerPage` should be replaced by a shared `CursorPage<ContentItem>` alias or direct import.
- My Listings service should expose a shared `OffsetPage<ListingSummaryItem>` return type, with a local wire type if the route still omits `nextOffset`.

- [ ] **Step 2: Add shared transport contracts**

Create `apps/web/src/lib/domain/pagination/types.ts`:

```ts
export type OffsetPage<T> = {
  items: T[];
  hasMore: boolean;
  nextOffset: number;
};

export type CursorPage<T> = {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
};
```

Create `apps/web/src/lib/domain/pagination/index.ts`:

```ts
export * from "./types";
```

- [ ] **Step 3: Adopt shared contracts in existing offset and cursor page call sites**

Implementation notes:
- In `apps/web/src/components/listings/create/domain/content/items/client.ts`, import `OffsetPage` and export `type ListingContentItemsPage = OffsetPage<ContentItem>;`.
- In `apps/web/src/server/actions/media/commands.ts`, import `CursorPage` and export `type UserMediaReelPickerPage = CursorPage<ContentItem>;`.
- In `apps/web/src/components/listings/myListings/domain/services/listingsService.ts`, define:

```ts
type ListingsPageWire = {
  items: ListingSummaryItem[];
  hasMore: boolean;
};

export type ListingsOffsetPage = OffsetPage<ListingSummaryItem>;
```

Then map:

```ts
const nextOffset = offset + data.items.length;
return { ...data, nextOffset };
```

- [ ] **Step 4: Update tests to reflect shared page semantics**

Assertions to add or keep:
- Listing create page tests still assert `nextOffset`.
- Reel picker command tests still assert `nextCursor` and `hasMore`.
- My Listings service and hook tests eventually consume `nextOffset` from the mapped service result, not from the wire format.

- [ ] **Step 5: Run focused tests**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/server/actions/listings/content/items/__tests__/queries.test.ts apps/web/src/server/actions/media/__tests__/commands.test.ts
```

Expected:
- PASS for listing create pagination tests
- PASS for reel picker pagination tests


### Task 2: Extract Shared Infinite Scroll Primitives

**Files:**
- Create: `apps/web/src/components/shared/pagination/useInfiniteIntersection.ts`
- Create: `apps/web/src/components/shared/pagination/useInfiniteSwrPages.ts`
- Create: `apps/web/src/components/shared/pagination/index.ts`
- Test: `apps/web/src/components/shared/pagination/__tests__/useInfiniteIntersection.test.tsx`
- Test: `apps/web/src/components/shared/pagination/__tests__/useInfiniteSwrPages.test.tsx`

- [ ] **Step 1: Write failing tests for the shared primitives**

Cover:
- observer attaches only when enabled and `hasMore` is true
- observer supports optional nested `root`
- SWR hook stops when previous page reports no more pages
- flattened items include initial items exactly once
- `fetchMore` is ignored while already validating

- [ ] **Step 2: Implement shared observer helper**

Create `useInfiniteIntersection.ts` with a focused API:

```ts
export function useInfiniteIntersection(options: {
  enabled?: boolean;
  hasMore: boolean;
  isLoadingMore?: boolean;
  onLoadMore: () => void | Promise<void>;
  root?: HTMLElement | null;
  rootMargin?: string;
}) { /* returns loadMoreRef */ }
```

Implementation requirements:
- support callback ref, not only `useRef`, so nested consumers can hand DOM nodes directly
- disconnect observer on dependency changes
- avoid firing when disabled, when no node is mounted, or while already loading

- [ ] **Step 3: Implement generic SWR-infinite page hook**

Create `useInfiniteSwrPages.ts` with an API shaped like:

```ts
export function useInfiniteSwrPages<TPage, TItem, TKey>(options: {
  enabled?: boolean;
  getKey: (pageIndex: number, previousPage: TPage | null) => TKey | null;
  fetcher: (key: TKey) => Promise<TPage>;
  selectItems: (page: TPage) => TItem[];
  getHasMore: (page: TPage) => boolean;
  initialItems?: TItem[];
  initialHasMore?: boolean;
  observer?: {
    root?: HTMLElement | null;
    rootMargin?: string;
  };
  swr?: {
    revalidateFirstPage?: boolean;
    dedupingInterval?: number;
  };
});
```

Return shape:

```ts
{
  items: TItem[];
  hasMore: boolean;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  errorMessage: string | null;
  fetchMore: () => Promise<void>;
  retry: () => void;
  loadMoreRef: (node: HTMLDivElement | null) => void;
  pages: TPage[];
}
```

- [ ] **Step 4: Wire the observer helper into the SWR helper**

Requirements:
- do not duplicate observer logic between the two hooks
- keep the observer helper reusable by non-SWR pagination later
- preserve the existing behavior where My Listings can start with no fetched SWR pages but still report `initialHasMore`

- [ ] **Step 5: Run focused tests**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/components/shared/pagination/__tests__/useInfiniteIntersection.test.tsx apps/web/src/components/shared/pagination/__tests__/useInfiniteSwrPages.test.tsx
```

Expected:
- PASS for observer behavior
- PASS for initial-item merge and stop conditions


### Task 3: Migrate Reel Picker to the Shared Hook

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/hooks/useUserMediaReelPickerInfinite.ts`
- Test: `apps/web/src/server/actions/media/__tests__/commands.test.ts`
- Test: `apps/web/src/components/shared/pagination/__tests__/useInfiniteSwrPages.test.tsx`
- Create or Modify: `apps/web/src/components/listings/create/media/video/hooks/__tests__/useUserMediaReelPickerInfinite.test.tsx`

- [ ] **Step 1: Write or update reel-picker hook tests**

Cover:
- first page uses `cursor: null`
- subsequent page uses previous `nextCursor`
- `hasMore: false` stops pagination
- nested scroll root is passed to the observer helper
- retry delegates to SWR mutate path

- [ ] **Step 2: Refactor reel picker hook to thin wrapper logic**

Implementation shape:
- keep the stable SWR key segment `["user-media-reel-picker", cursor]`
- delegate common state derivation and load-more observer behavior to `useInfiniteSwrPages`
- keep reel-picker-specific fetch error messaging as `"Failed to load user media."`

- [ ] **Step 3: Verify no behavior regressions in public return shape**

Keep the hook API compatible unless the consuming component can be updated in the same change:
- `items`
- `errorMessage`
- `isInitialLoading`
- `isLoadingMore`
- `hasMore`
- `loadMoreRef`
- `retry`

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/server/actions/media/__tests__/commands.test.ts apps/web/src/components/listings/create/media/video/hooks/__tests__/useUserMediaReelPickerInfinite.test.tsx
```

Expected:
- PASS for cursor pagination behavior
- PASS for reel-picker hook integration behavior


### Task 4: Migrate My Listings to the Shared Hook Without Changing Its Route Contract

**Files:**
- Modify: `apps/web/src/components/listings/myListings/domain/services/listingsService.ts`
- Modify: `apps/web/src/components/listings/myListings/domain/hooks/useListingPagination.ts`
- Test: `apps/web/src/components/listings/myListings/domain/hooks/__tests__/useListingPagination.test.tsx`
- Test: `apps/web/src/app/api/v1/listings/__tests__/route.test.ts`

- [ ] **Step 1: Update or add failing tests around initial merge behavior**

Cover:
- initial server-rendered listings remain first in the merged result
- first client fetch starts at `initialListings.length`
- no duplicate rows after the first `fetchMoreListings`
- `initialHasMore` drives `hasMore` before any SWR page is loaded
- load error still reports `"Failed to load more listings."`

- [ ] **Step 2: Refactor My Listings service to map wire data into `OffsetPage`**

Implementation:
- leave `GET /api/v1/listings` unchanged for now
- compute `nextOffset` inside `fetchListingsPage(url)` using the `offset` encoded in the URL plus `items.length`
- return `OffsetPage<ListingSummaryItem>` to the hook layer

Parsing requirement:
- use `new URL(url, window.location.origin)` or a small helper safe for relative URLs in tests
- if offset is missing or invalid, fall back to `0`

- [ ] **Step 3: Refactor My Listings hook to use the shared infinite SWR helper**

Implementation requirements:
- keep the current public hook API for `MyListingsView`
- continue skipping page fetches when the previous page reports `hasMore: false`
- ensure initial items are merged once via the shared helper instead of ad hoc concatenation

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/myListings/domain/hooks/__tests__/useListingPagination.test.tsx apps/web/src/app/api/v1/listings/__tests__/route.test.ts
```

Expected:
- PASS for SSR+hydration merge behavior
- PASS for existing route contract behavior


### Task 5: Share Observer Logic With Listing Create Load-More Without Changing Its Domain State Model

**Files:**
- Modify: `apps/web/src/components/listings/create/domain/content/generation/useContentGeneration.ts` or the current load-more owner if different
- Modify: `apps/web/src/components/listings/create/domain/content/generation/stateTransitions.ts` only if state wiring needs a small adapter
- Modify: `apps/web/src/components/listings/create/domain/content/items/transport.ts`
- Test: `apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx`
- Test: `apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts`

- [ ] **Step 1: Confirm the exact client owner of listing-create load-more state**

Before editing, verify whether the sentinel and `nextOffset` handling live in:
- `useContentGeneration.tsx`
- a content-query effect file
- another listing-create hook introduced by the current refactor branch

Do not move filter-bucket or generation state logic into the new pagination helper.

- [ ] **Step 2: Replace only the observer/sentinel duplication**

Implementation requirements:
- keep `fetchListingContentItemsPageCached`
- keep `nextOffset` and filter-bucket reset semantics
- use `useInfiniteIntersection` only if it reduces duplication without hiding listing-create-specific state transitions

- [ ] **Step 3: Preserve reset behavior on media tab or subcategory changes**

Assertions to keep or add:
- switching tab/subcategory resets offset back to `0`
- next fetched page uses the newly reset state, not stale offset
- bucket/item merging behavior stays unchanged

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts apps/web/src/server/actions/listings/content/items/__tests__/queries.test.ts apps/web/src/app/api/v1/listings/[listingId]/content/__tests__/route.test.ts
```

Expected:
- PASS for listing-create reset and pagination behavior
- PASS for route and server query coverage


### Task 6: Leave Media Library Separate and Document the Boundary

**Files:**
- Modify: `apps/web/src/components/media/domain/hooks/useMediaPagination.ts`
- Test: `apps/web/src/components/media/domain/hooks/__tests__/useMediaPagination.test.tsx`
- Optional: `apps/web/src/components/media/domain/README.md`

- [ ] **Step 1: Keep Media Library out of the SWR abstraction**

Required boundary:
- `useMediaPagination` remains client-windowing over an already-loaded collection
- do not add SWR, cursors, or transport-level page types here

- [ ] **Step 2: Optionally reuse only the observer helper if it keeps the hook simple**

Accept this refactor only if the result is clearer than the current hook. If the abstraction becomes more indirect than useful, skip it.

- [ ] **Step 3: Add a short comment or README note explaining why this hook stays separate**

Target message:
- “This hook reveals more of an already-loaded array and is intentionally separate from server pagination hooks.”

- [ ] **Step 4: Run focused tests**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/components/media/domain/hooks/__tests__/useMediaPagination.test.tsx
```

Expected:
- PASS for visible-count behavior


### Task 7: Full Verification and Cleanup

**Files:**
- Verify touched files from prior tasks

- [ ] **Step 1: Run targeted suite covering all pagination consumers**

Run:
```bash
npm run test --workspace=@zencourt/web -- --runInBand apps/web/src/server/actions/listings/content/items/__tests__/queries.test.ts apps/web/src/server/actions/media/__tests__/commands.test.ts apps/web/src/components/listings/myListings/domain/hooks/__tests__/useListingPagination.test.tsx apps/web/src/components/listings/create/domain/content/generation/__tests__/useContentGeneration.test.tsx apps/web/src/components/listings/create/domain/content/generation/__tests__/stateTransitions.test.ts apps/web/src/components/media/domain/hooks/__tests__/useMediaPagination.test.tsx apps/web/src/app/api/v1/listings/__tests__/route.test.ts 'apps/web/src/app/api/v1/listings/[listingId]/content/__tests__/route.test.ts'
```

Expected:
- PASS across offset, cursor, and client-windowing flows

- [ ] **Step 2: Run workspace checks required by repo guidance**

Run:
```bash
npm run type-check --workspace=@zencourt/web
npm run test --workspace=@zencourt/web
```

Expected:
- no type errors
- no pagination regressions outside focused tests

- [ ] **Step 3: Review for contract drift**

Manual checks:
- My Listings route contract is unchanged
- listing-create route still returns `nextOffset`
- reel picker still returns opaque cursors
- no shared helper imports server-only modules

- [ ] **Step 4: Commit in logical slices**

Suggested commits:
```bash
git add apps/web/src/lib/domain/pagination apps/web/src/components/shared/pagination
git commit -m "refactor: add shared pagination contracts and hooks"

git add apps/web/src/components/listings/create/media/video/hooks apps/web/src/server/actions/media
git commit -m "refactor: migrate reel picker to shared pagination"

git add apps/web/src/components/listings/myListings apps/web/src/app/api/v1/listings
git commit -m "refactor: align my listings with shared pagination types"

git add apps/web/src/components/listings/create apps/web/src/components/media
git commit -m "refactor: share load-more observer behavior"
```


## Notes and Guardrails

- Keep server implementations resource-specific. Shared contracts are for transport consistency, not a single pagination service.
- Do not change DB/query strategy for user media or listings just to fit the client abstraction.
- Treat My Listings SSR hydration as the highest regression risk.
- Do not centralize listing-create filter-bucket or state-transition logic into a generic pagination helper.
- Media Library is intentionally not part of the server-pagination abstraction unless product requirements change to paged fetching.

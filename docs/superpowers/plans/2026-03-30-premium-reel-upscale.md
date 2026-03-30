# Premium Reel Upscale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standard vs premium reel downloads in the listing create preview modal, cache per-clip premium upscale URLs, and run premium exports as async background jobs that upscale missing room clips before rendering.

**Architecture:** Extend the existing listing-scoped reel export flow rather than building a parallel pipeline. `apps/web` will validate the request, resolve trusted clip-version references, and proxy the export lifecycle; `apps/video-server` will own premium asset preparation and render job execution; `video_clip_versions.upscale_url` will cache premium clip assets for reuse.

**Tech Stack:** React, TypeScript, Next.js app routes, server actions, Drizzle, Jest, Express, Remotion

---

## File Structure

### Create

- `apps/video-server/src/services/render/domain/premiumReelExport.ts`
  - premium export preparation orchestration
  - source asset selection by export quality
- `apps/video-server/src/services/render/domain/__tests__/premiumReelExport.test.ts`
  - reuse, persistence, and failure behavior tests
- `apps/video-server/src/services/render/providers/wavespeed/upscaler.ts`
  - WaveSpeed Video Upscaler Pro client wrapper
- `apps/video-server/src/services/render/providers/wavespeed/__tests__/upscaler.test.ts`
  - request/response contract tests if the wrapper is large enough to justify direct tests

### Modify

- `packages/db/drizzle/schema/videoClipVersions.ts`
  - add nullable `upscaleUrl`
- generated Drizzle migration artifacts from `npm run db:generate`
  - reflect the new column and metadata updates
- `packages/shared/types/models/videoGeneration.ts`
  - include `upscaleUrl` in clip version records if needed
- `apps/web/src/lib/domain/listings/content/reels.ts`
  - add `quality`
  - replace generic `in-progress` with `upscaling` and `rendering`
- `apps/web/src/server/actions/listings/content/reels/export.ts`
  - resolve trusted clip version metadata, not just source URLs
  - include `quality` in the exported request
- `apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts`
  - request builder tests for standard vs premium and missing sources
- `apps/web/src/server/models/video/clips/__tests__/clipVersions.test.ts`
  - mutation coverage for persisting `upscaleUrl`
- `apps/web/src/server/models/video/clips/__tests__/queries.test.ts`
  - query coverage for reading `upscaleUrl`
- `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/route.ts`
  - pass the richer export request to `apps/video-server`
- `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/__tests__/route.test.ts`
  - create-route tests for `quality`
- `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/route.ts`
  - map upstream status to the new enum
- `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/__tests__/route.test.ts`
  - status-route tests for `upscaling` and `rendering`
- `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
  - add standard/premium download menu
  - post `quality`
  - present new premium status copy
- `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
  - modal UI and payload tests
- `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.download-error.test.tsx`
  - premium status and failure tests
- `apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx`
  - thread new status values through external download state if still used there
- `apps/web/src/components/listings/create/components/__tests__/ListingVideoPreviewGrid.test.tsx`
  - grid state tests for new status enum if needed
- `apps/video-server/src/routes/renders/domain/reelExportRequests.ts`
  - parse `quality` and clip-version metadata
- `apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts`
  - parser coverage for premium requests
- `apps/video-server/src/routes/renders/route.ts`
  - create premium-aware reel export jobs and emit phase status
- `apps/video-server/src/routes/renders/__tests__/route.test.ts`
  - route coverage for premium job creation and status
- `apps/video-server/src/routes/renders/orchestrators/handlers.ts`
  - expose `upscaling` and `rendering` in the rendered job status contract
- `apps/video-server/src/routes/renders/orchestrators/__tests__/handlers.test.ts`
  - status mapping tests for the new reel export phases
- `apps/video-server/src/services/render/queue.ts`
  - support non-generic in-flight premium phase tracking if the queue remains the status source
- `apps/video-server/src/services/render/types.ts`
  - extend render job state types for premium reel export phases

## Task 1: Add Schema and Shared Contract Coverage

**Files:**
- Modify: `packages/db/drizzle/schema/videoClipVersions.ts`
- Modify: `packages/shared/types/models/videoGeneration.ts`
- Modify: `apps/web/src/lib/domain/listings/content/reels.ts`
- Test: `packages/db/__tests__/schema.columns.test.ts`
- Test: `apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts`
- Test: `apps/web/src/server/models/video/clips/__tests__/clipVersions.test.ts`
- Test: `apps/web/src/server/models/video/clips/__tests__/queries.test.ts`

- [ ] **Step 1: Write failing tests for the new schema/contract fields**

Add or update tests to assert:
- `video_clip_versions` exposes `upscaleUrl`
- reel export requests accept `quality`
- reel export status supports `upscaling` and `rendering`
- clip version queries and updates can read/write `upscaleUrl`

Run: `npm test --workspace=@zencourt/web -- export.test.ts`
Expected: FAIL because `quality` and the new statuses do not exist yet

- [ ] **Step 2: Add `upscaleUrl`, `quality`, and the new status enum**

Implement the minimal type/schema changes in:
- `videoClipVersions.ts`
- `videoGeneration.ts` if needed for typed reads
- `reels.ts`

- [ ] **Step 3: Generate the migration artifacts**

Run: `npm run db:generate`
Expected: a new migration and updated Drizzle metadata that add `video_clip_versions.upscale_url`

- [ ] **Step 4: Re-run the targeted tests**

Run: `npm test --workspace=@zencourt/web -- export.test.ts`
Expected: PASS for the new request/status contract assertions

- [ ] **Step 5: Commit**

```bash
git add packages/db/drizzle/schema/videoClipVersions.ts packages/db/drizzle/migrations packages/db/drizzle/migrations/meta packages/shared/types/models/videoGeneration.ts apps/web/src/lib/domain/listings/content/reels.ts apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts apps/web/src/server/models/video/clips/__tests__/clipVersions.test.ts apps/web/src/server/models/video/clips/__tests__/queries.test.ts packages/db/__tests__/schema.columns.test.ts
git commit -m "feat: add premium reel export contracts"
```

## Task 2: Extend Web Reel Export Builders and Routes

**Files:**
- Modify: `apps/web/src/server/actions/listings/content/reels/export.ts`
- Modify: `apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts`
- Modify: `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/route.ts`
- Modify: `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/__tests__/route.test.ts`
- Modify: `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/route.ts`
- Modify: `apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/__tests__/route.test.ts`

- [ ] **Step 1: Write failing web tests for premium export requests**

Cover:
- request builder includes `quality`
- listing clips resolve to clip version ids plus trusted source URLs
- create route forwards premium payloads
- status route accepts `upscaling` and `rendering`

Run: `npm test --workspace=@zencourt/web -- export.test.ts 'reels/exports'`
Expected: FAIL because the request builder and status route do not support the premium contract yet

- [ ] **Step 2: Update the export request builder**

Return richer clip entries along these lines:

```ts
{
  clipVersionId: row.clipVersion.id,
  originalVideoUrl: row.clipVersion.videoUrl,
  upscaleUrl: row.clipVersion.upscaleUrl ?? null,
  durationSeconds: segment.durationSeconds,
  textOverlay: segment.textOverlay ?? null,
  supplementalAddressOverlay: segment.supplementalAddressOverlay ?? null
}
```

Include `quality` on the request object and keep user-media handling explicit. If premium export should reject user-media segments for now, make that behavior explicit in tests and request validation. If the existing reel flow must keep supporting user media, pass those segments through without premium clip-version metadata and let the video server bypass upscaling for them.

For this implementation, premium export should continue to allow mixed reels:
- listing-generated room clips are eligible for cache reuse and WaveSpeed upscaling
- user-media segments pass through unchanged and are never sent to WaveSpeed

Write that rule directly into request-builder tests so the payload shape is fixed before implementation.

- [ ] **Step 3: Update the create and status routes**

- Create route: proxy the new request shape to the video server.
- Status route: treat `upscaling` and `rendering` as valid status values.

- [ ] **Step 4: Re-run the targeted web tests**

Run: `npm test --workspace=@zencourt/web -- apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/__tests__/route.test.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/actions/listings/content/reels/export.ts apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/route.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/__tests__/route.test.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/route.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/__tests__/route.test.ts
git commit -m "feat: add premium reel export web flow"
```

## Task 3: Add Modal Standard/Premium Download UX

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.download-error.test.tsx`
- Modify: `apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx`
- Modify: `apps/web/src/components/listings/create/components/__tests__/ListingVideoPreviewGrid.test.tsx`

- [ ] **Step 1: Write failing modal tests for the new menu and statuses**

Cover:
- clicking the download button opens a menu
- menu shows `Standard download` and `Premium 4K download`
- each option posts the same draft payload with different `quality`
- premium polling displays `Upscaling room clips...` and `Rendering premium reel...`

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal`
Expected: FAIL because the modal still triggers a single download path and does not know the new statuses

- [ ] **Step 2: Implement the menu and request branching**

Add a small anchored menu in `VideoPreviewModal.tsx` and thread `quality` into `buildExportPayload()` or the download handler.

- [ ] **Step 3: Update progress/status copy and parent state handling**

Ensure both modal-local and grid-provided external download state treat:
- `queued`
- `upscaling`
- `rendering`

as active progress states.

- [ ] **Step 4: Re-run the targeted component tests**

Run: `npm test --workspace=@zencourt/web -- apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.download-error.test.tsx apps/web/src/components/listings/create/components/__tests__/ListingVideoPreviewGrid.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.download-error.test.tsx apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx apps/web/src/components/listings/create/components/__tests__/ListingVideoPreviewGrid.test.tsx
git commit -m "feat: add premium reel download menu"
```

## Task 4: Add Video-Server Premium Export Orchestration

**Files:**
- Modify: `apps/video-server/src/routes/renders/domain/reelExportRequests.ts`
- Modify: `apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts`
- Create: `apps/video-server/src/services/render/domain/premiumReelExport.ts`
- Create: `apps/video-server/src/services/render/domain/__tests__/premiumReelExport.test.ts`
- Create: `apps/video-server/src/services/render/providers/wavespeed/upscaler.ts`
- Modify: `apps/video-server/src/routes/renders/route.ts`
- Modify: `apps/video-server/src/routes/renders/__tests__/route.test.ts`
- Modify: `apps/video-server/src/routes/renders/orchestrators/handlers.ts`
- Modify: `apps/video-server/src/routes/renders/orchestrators/__tests__/handlers.test.ts`
- Modify: `apps/video-server/src/services/render/queue.ts`
- Modify: `apps/video-server/src/services/render/types.ts`

- [ ] **Step 1: Write failing video-server tests for premium request parsing and orchestration**

Cover:
- parser accepts `quality`, `clipVersionId`, `originalVideoUrl`, and `upscaleUrl`
- premium orchestration reuses cached `upscaleUrl`
- missing `upscaleUrl` triggers the WaveSpeed client
- transient WaveSpeed failures retry with a bounded retry policy before failing
- successful upscale persists the URL
- any upscale failure fails the export
- user-media segments bypass upscaling and retain original URLs
- standard export bypasses the premium path

Run: `npm test --workspace=@zencourt/video-server -- reelExportRequests premiumReelExport route`
Expected: FAIL because the video server does not understand premium payloads or upscale orchestration yet

- [ ] **Step 2: Extend the request parser and add WaveSpeed wrapper**

Keep the parser strict and minimal. The WaveSpeed wrapper should isolate provider-specific HTTP details behind a focused interface such as:

```ts
type UpscaleVideoResult = { url: string };

async function upscaleVideoTo4k(input: { sourceUrl: string }): Promise<UpscaleVideoResult>
```

Define the retry policy in tests before implementation. Keep it bounded and simple, for example:
- up to 3 attempts per listing-generated clip
- no retry for validation errors
- retry only for transient provider/network failures

- [ ] **Step 3: Implement premium export preparation**

Implement a function that receives the trusted export payload and returns composition-ready clips:
- standard: original URLs
- premium: cached `upscaleUrl` or newly created WaveSpeed URLs persisted back to the clip-version record

Use the existing clip-version mutation path from the monorepo DB client instead of ad hoc SQL.

- [ ] **Step 4: Update the reel-export route and job status transitions**

Update the actual reel-export status owner, not just the route surface. That means touching the queue/state and handler layers that currently expose only generic `in-progress`.

Emit:
- `queued` when accepted
- `upscaling` while premium assets are being prepared
- `rendering` when the render queue is actively rendering
- `completed`, `failed`, `canceled` as today

- [ ] **Step 5: Re-run the targeted video-server tests**

Run: `npm test --workspace=@zencourt/video-server -- apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts apps/video-server/src/services/render/domain/__tests__/premiumReelExport.test.ts apps/video-server/src/routes/renders/orchestrators/__tests__/handlers.test.ts apps/video-server/src/routes/renders/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/video-server/src/routes/renders/domain/reelExportRequests.ts apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts apps/video-server/src/services/render/domain/premiumReelExport.ts apps/video-server/src/services/render/domain/__tests__/premiumReelExport.test.ts apps/video-server/src/services/render/providers/wavespeed/upscaler.ts apps/video-server/src/routes/renders/orchestrators/handlers.ts apps/video-server/src/routes/renders/orchestrators/__tests__/handlers.test.ts apps/video-server/src/services/render/queue.ts apps/video-server/src/services/render/types.ts apps/video-server/src/routes/renders/route.ts apps/video-server/src/routes/renders/__tests__/route.test.ts
git commit -m "feat: add premium reel upscale orchestration"
```

## Task 5: End-to-End Verification

**Files:**
- Review changes across the files above

- [ ] **Step 1: Run focused workspace tests**

Run: `npm test --workspace=@zencourt/web -- apps/web/src/server/actions/listings/content/reels/__tests__/export.test.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/__tests__/route.test.ts apps/web/src/app/api/v1/listings/[listingId]/reels/exports/[exportId]/__tests__/route.test.ts apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.download-error.test.tsx apps/web/src/components/listings/create/components/__tests__/ListingVideoPreviewGrid.test.tsx`
Expected: PASS

- [ ] **Step 2: Run focused video-server tests**

Run: `npm test --workspace=@zencourt/video-server -- apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts apps/video-server/src/services/render/domain/__tests__/premiumReelExport.test.ts apps/video-server/src/routes/renders/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 3: Run type checks for touched workspaces**

Run: `npm run type-check --workspace=@zencourt/web`
Expected: PASS

Run: `npm run type-check --workspace=@zencourt/video-server`
Expected: PASS

- [ ] **Step 4: Review the diff for requirement coverage**

Check that the final diff includes:
- `upscale_url` persistence
- `quality` in requests
- standard/premium menu in the modal
- premium `upscaling` / `rendering` status handling
- WaveSpeed integration and cache reuse

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: add premium reel upscale downloads"
```

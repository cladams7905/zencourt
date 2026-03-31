# Reel Preview Download And Favorite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add modal-scoped download and favorite actions for reel previews so users can export the dirty draft as an on-demand MP4 and save-then-favorite the current reel draft.

**Architecture:** Keep one canonical reel draft builder in the modal flow, reuse the existing reel save normalization path for save/favorite mutations, add a listing-scoped web download route that accepts a reduced export payload, and add a dedicated synchronous `POST /renders/reel-export` video-server endpoint that renders explicit draft clips and streams the MP4 back.

**Tech Stack:** React, TypeScript, Next.js app routes, server actions, Jest, Express, Remotion, shared API/video types

---

## File Structure

### New files

- Create: `apps/web/src/server/actions/listings/content/reels/export.ts`
  - reduced reel export payload validation
  - source resolution for listing clips and user media
  - filename generation
  - video-server request builder

- Create: `apps/web/src/app/api/v1/listings/[listingId]/reels/download/route.ts`
  - listing-scoped POST download route that streams the rendered MP4

- Create: `apps/web/src/app/api/v1/listings/[listingId]/reels/download/__tests__/route.test.ts`
  - route validation and streaming response tests

- Create: `apps/video-server/src/routes/renders/domain/reelExportRequests.ts`
  - request parsing for `POST /renders/reel-export`

- Create: `apps/video-server/src/services/render/domain/reelExport.ts`
  - mapping from explicit draft clip payload to Remotion render input

- Create: `apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts`
  - request parser tests for the new endpoint

- Create: `apps/video-server/src/services/render/domain/__tests__/reelExport.test.ts`
  - mapping tests for export clips and overlays

### Existing files to modify

- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
  - add modal action buttons
  - build canonical draft payload
  - wire save/favorite/download pending states
  - use fetch/blob/object URL download flow

- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
  - cover new controls, favorite orchestration, and download request flow

- Modify: `apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx`
  - pass `listingId` into the modal
  - replace local favorite `Set` with persisted favorite derivation from saved content
  - handle replacement after save-and-favorite

- Modify: `apps/web/src/components/listings/create/shared/types.ts`
  - export any new modal payload types if needed

- Modify: `apps/web/src/lib/domain/listings/content/create.ts`
  - add reduced reel export payload types if they belong in shared web-domain contracts

- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
  - extract reusable save normalization helpers
  - add `saveAndFavoriteListingVideoReel`

- Modify: `apps/web/src/server/actions/listings/content/reels/index.ts`
  - export the new action/helper symbols

- Modify: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`
  - cover cached-create save-then-favorite and saved-content update-then-favorite

- Modify: `apps/web/src/server/models/content/mutations.ts`
  - only if a small helper improves focused `isFavorite` updates cleanly

- Modify: `packages/shared/types/api/video.ts`
  - add `VideoServerReelExportRequest` and any matching response type

- Modify: `apps/video-server/src/routes/renders/route.ts`
  - add `POST /renders/reel-export`

- Modify: `apps/video-server/src/routes/renders/__tests__/route.test.ts`
  - cover auth and successful streaming for the new endpoint

- Modify: `apps/video-server/src/services/render/providers/remotion/composition/ListingVideo.tsx`
  - render supplemental address overlays in addition to primary overlays

- Modify: `apps/video-server/src/services/render/providers/remotion/provider.ts`
  - expose or reuse a direct render-to-buffer path suitable for synchronous export

---

### Task 1: Add Modal Action Tests and Canonical Draft Builders

**Files:**

- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
- Reference: `apps/web/src/lib/domain/listings/content/create.ts`
- Reference: `apps/web/src/components/listings/create/media/video/components/ListingStageTimelinePreviewComposition.tsx`

- [ ] **Step 1: Write failing modal tests for the new controls**

Add tests that assert:

- the modal renders `Download reel preview` and `Favorite reel preview` buttons in the player area
- clicking favorite with dirty draft calls a new save-and-favorite callback with updated hook/caption/sequence/overlay fields
- clicking download posts a reduced export payload built from dirty draft segments
- buttons disable while their async action is in flight

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: FAIL because the modal does not expose these controls or callbacks yet

- [ ] **Step 2: Add a canonical draft builder in `VideoPreviewModal.tsx`**

Implement a small internal helper that returns:

```ts
function buildDraftPayload(): PlayablePreviewTextUpdate {
  return {
    hook: normalizedHook,
    caption: normalizedCaption,
    overlayBackground: overlayDraft.background,
    overlayPosition: overlayDraft.position,
    overlayFontPairing: overlayDraft.fontPairing,
    showAddress: overlayDraft.showAddress,
    orderedClipIds: segmentDraft.map((segment) => segment.clipId),
    clipDurationOverrides: Object.fromEntries(
      segmentDraft.map((segment) => [segment.clipId, segment.durationSeconds])
    ),
    sequence: segmentDraft.map((segment) => ({
      sourceType: segment.sourceType,
      sourceId: segment.sourceId ?? segment.clipId,
      durationSeconds: segment.durationSeconds
    })),
    saveTarget: selectedPreview!.captionItemKey!
  };
}
```

- [ ] **Step 3: Add a reduced export payload builder**

Derive export-only payload from the same normalized draft:

```ts
function buildExportPayload() {
  return {
    filenameBase: `reel-preview-${selectedPreview?.variationNumber ?? 1}`,
    segments: segmentDraft.map((segment) => ({
      sourceType: segment.sourceType,
      sourceId: segment.sourceId ?? segment.clipId,
      durationSeconds: segment.durationSeconds,
      textOverlay: segment.textOverlay ?? null,
      supplementalAddressOverlay: segment.supplementalAddressOverlay ?? null
    }))
  };
}
```

- [ ] **Step 4: Run the modal test file again**

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS for draft-builder-related assertions, with callback wiring failures still possible until later tasks

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx
git commit -m "test: cover reel modal favorite and download actions"
```

### Task 2: Wire Modal UI, Persisted Favorite State, and Client Download Flow

**Files:**

- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
- Reference: `apps/web/src/components/listings/create/domain/clipManager/actions.ts`
- Reference: `apps/web/src/components/listings/create/media/video/components/VideoPreviewCard.tsx`

- [ ] **Step 1: Extend the modal props and grid expectations with failing tests**

Add tests or update existing harnesses to verify:

- `listingId` is passed through to the modal
- modal receives `onSaveAndFavoritePreview`
- the grid favorite state derives from persisted content rather than the local `Set`

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx ListingVideoPreviewGrid`
Expected: FAIL because the grid still uses local-only favorite state and the modal lacks the new props

- [ ] **Step 2: Thread the new props into `VideoPreviewModal`**

Add props for:

- `listingId`
- `onSaveAndFavoritePreview`

Render top-right icon buttons in the modal player container using the existing button styling language.

- [ ] **Step 3: Implement the client download helper in the modal**

Use `fetch -> blob -> object URL -> anchor click`:

```ts
const response = await fetch(`/api/v1/listings/${listingId}/reels/download`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(buildExportPayload())
});
const blob = await response.blob();
const url = URL.createObjectURL(blob);
const link = document.createElement("a");
link.href = url;
link.download = "reel-preview.mp4";
link.click();
URL.revokeObjectURL(url);
```

Handle non-OK responses before reading the blob.

- [ ] **Step 4: Replace local favorite state in the grid**

Remove the modal/grid-local `favoritePlanIds` state. Derive `isFavorite` from `preview.captionItem?.isFavorite ?? false`, and update the parent replacement flow so favoriting a reel updates the mapped saved content item and recomputes previews.

- [ ] **Step 5: Run targeted UI tests**

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS for control rendering, pending-state behavior, and download helper orchestration

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx
git commit -m "feat: wire reel modal favorite and download controls"
```

### Task 3: Add Save-Then-Favorite Reel Action

**Files:**

- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
- Modify: `apps/web/src/server/actions/listings/content/reels/index.ts`
- Modify: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`
- Reference: `apps/web/src/server/models/content/mutations.ts`
- Reference: `apps/web/src/server/actions/listings/content/reels/mappers.ts`

- [ ] **Step 1: Write the failing action tests**

Add tests for:

- cached-create reel draft saves as new content and then updates `isFavorite=true`
- saved-content reel draft updates metadata and then updates `isFavorite=true`
- the returned mapped content item exposes `isFavorite: true`
- favorite is not attempted if save validation fails

Run: `npm test --workspace=@zencourt/web -- actions.test.ts --runInBand`
Expected: FAIL because `saveAndFavoriteListingVideoReel` does not exist yet

- [ ] **Step 2: Extract reusable normalized-save helpers from the current save action**

Refactor `actions.ts` so save logic can be reused without duplicating:

- `normalizeReelInput`
- `saveCachedReelAsContent`
- `updateSavedReelContent`

- [ ] **Step 3: Implement `saveAndFavoriteListingVideoReel`**

Add:

```ts
export const saveAndFavoriteListingVideoReel = withServerActionCaller(
  "saveAndFavoriteListingVideoReel",
  async (listingId: string, params: PlayablePreviewTextUpdate) =>
    withCurrentUserListingAccess(listingId, async ({ user }) => {
      const saved = await saveListingVideoReelInternal(
        user.id,
        listingId,
        params
      );
      const favorited = await updateContent(user.id, saved.savedContentId!, {
        isFavorite: true
      });
      return mapSavedReelContentToCreateItem(favorited)!;
    })
);
```

Keep the implementation explicit about save-first ordering.

- [ ] **Step 4: Export the new action and update any call sites**

Update `index.ts` exports and the grid/modal caller wiring to use the new action.

- [ ] **Step 5: Run the action tests**

Run: `npm test --workspace=@zencourt/web -- apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/actions/listings/content/reels/actions.ts apps/web/src/server/actions/listings/content/reels/index.ts apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts
git commit -m "feat: add save and favorite reel action"
```

### Task 4: Add Web Reel Export Orchestration and Download Route

**Files:**

- Create: `apps/web/src/server/actions/listings/content/reels/export.ts`
- Create: `apps/web/src/app/api/v1/listings/[listingId]/reels/download/route.ts`
- Create: `apps/web/src/app/api/v1/listings/[listingId]/reels/download/__tests__/route.test.ts`
- Modify: `apps/web/src/lib/domain/listings/content/create.ts`
- Modify: `packages/shared/types/api/video.ts`
- Reference: `apps/web/src/app/api/v1/listings/[listingId]/clips/[clipVersionId]/download/route.ts`
- Reference: `apps/web/src/server/actions/listings/viewData.ts`
- Reference: `apps/web/src/server/actions/listings/content/reels/userMedia.ts`

- [ ] **Step 1: Write failing route and export-service tests**

Add tests for:

- POST body validation for missing or empty segments
- listing access enforcement
- missing clip/user-media source resolution failures
- successful streaming response with attachment headers
- mapping reduced export payload to `VideoServerReelExportRequest`

Run: `npm test --workspace=@zencourt/web -- reels/download`
Expected: FAIL because the route and export module do not exist yet

- [ ] **Step 2: Add reduced export payload typing**

Introduce explicit types similar to:

```ts
export type PlayablePreviewExportSegment = {
  sourceType: ReelClipSourceType;
  sourceId: string;
  durationSeconds: number;
  textOverlay?: PreviewTextOverlay | null;
  supplementalAddressOverlay?: {
    overlay: PreviewTextOverlay;
    placement: "bottom-third" | "below-primary" | "low-bottom";
  } | null;
};
```

Keep this separate from `PlayablePreviewTextUpdate`.

- [ ] **Step 3: Implement `export.ts` orchestration**

Implement helpers to:

- validate export payload
- fetch/resolve listing clip versions and user media
- build trusted clip URLs
- construct:

```ts
const request: VideoServerReelExportRequest = {
  exportId: nanoid(),
  orientation: "vertical",
  clips: resolvedSegments.map((segment) => ({
    src: segment.src,
    durationSeconds: segment.durationSeconds,
    textOverlay: segment.textOverlay ?? null,
    supplementalAddressOverlay: segment.supplementalAddressOverlay ?? null
  }))
};
```

- [ ] **Step 4: Implement the listing-scoped POST route**

In the route:

- parse `listingId`
- validate current user access
- call the export orchestration
- `fetch()` the video server endpoint with server auth
- forward the stream back as:

```ts
return new NextResponse(upstream.body, {
  status: 200,
  headers: {
    "Content-Type": "video/mp4",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "private, no-store"
  }
});
```

- [ ] **Step 5: Run route tests**

Run: `npm test --workspace=@zencourt/web -- apps/web/src/app/api/v1/listings/[listingId]/reels/download/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/server/actions/listings/content/reels/export.ts apps/web/src/app/api/v1/listings/[listingId]/reels/download/route.ts apps/web/src/app/api/v1/listings/[listingId]/reels/download/__tests__/route.test.ts apps/web/src/lib/domain/listings/content/create.ts packages/shared/types/api/video.ts
git commit -m "feat: add reel draft export route"
```

### Task 5: Add Video-Server Reel Export Endpoint and Render Mapping

**Files:**

- Create: `apps/video-server/src/routes/renders/domain/reelExportRequests.ts`
- Create: `apps/video-server/src/services/render/domain/reelExport.ts`
- Create: `apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts`
- Create: `apps/video-server/src/services/render/domain/__tests__/reelExport.test.ts`
- Modify: `apps/video-server/src/routes/renders/route.ts`
- Modify: `apps/video-server/src/routes/renders/__tests__/route.test.ts`
- Modify: `apps/video-server/src/services/render/providers/remotion/composition/ListingVideo.tsx`
- Modify: `apps/video-server/src/services/render/providers/remotion/provider.ts`
- Reference: `apps/video-server/src/services/render/domain/composition.ts`
- Reference: `apps/web/src/components/listings/create/media/video/components/ListingStageTimelinePreviewComposition.tsx`

- [ ] **Step 1: Write failing video-server tests**

Add tests for:

- parser rejects empty export clip arrays
- mapping preserves clip order and durations
- mapping carries primary overlays
- mapping carries supplemental address overlays
- route returns `401` without API key and `200` with a mocked render stream

Run: `npm run test --workspace=@zencourt/video-server -- reels`
Expected: FAIL because the endpoint and mapping do not exist yet

- [ ] **Step 2: Add shared request parsing for `POST /renders/reel-export`**

Parse:

```ts
type VideoServerReelExportRequest = {
  exportId: string;
  orientation: "vertical" | "landscape";
  clips: Array<{
    src: string;
    durationSeconds: number;
    textOverlay?: PreviewTextOverlay | null;
    supplementalAddressOverlay?: {
      overlay: PreviewTextOverlay;
      placement: "bottom-third" | "below-primary" | "low-bottom";
    } | null;
  }>;
};
```

- [ ] **Step 3: Update Remotion composition support**

Extend `ListingVideo.tsx` so each rendered clip can also draw `supplementalAddressOverlay` using the same placement logic as the web preview composition.

- [ ] **Step 4: Add a direct render-to-buffer path**

Reuse the provider’s existing synchronous render behavior and expose a small helper or branch that accepts explicit clips, renders the MP4, and returns `{ videoBuffer, durationSeconds }` without queue persistence.

- [ ] **Step 5: Implement the new endpoint**

In `route.ts`, add:

```ts
router.post(
  "/reel-export",
  asyncHandler(async (req, res) => {
    const input = parseCreateReelExportRequest(req.body);
    const result = await remotionProvider.renderListingVideo({
      clips: buildReelExportClips(input),
      orientation: input.orientation,
      videoId: input.exportId
    });
    res.setHeader("Content-Type", "video/mp4");
    res.status(200).send(result.videoBuffer);
  })
);
```

Set `Cache-Control: no-store` if current route conventions do not already do so.

- [ ] **Step 6: Run video-server tests**

Run: `npm run test --workspace=@zencourt/video-server -- routes/renders services/render`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/video-server/src/routes/renders/domain/reelExportRequests.ts apps/video-server/src/services/render/domain/reelExport.ts apps/video-server/src/routes/renders/domain/__tests__/reelExportRequests.test.ts apps/video-server/src/services/render/domain/__tests__/reelExport.test.ts apps/video-server/src/routes/renders/route.ts apps/video-server/src/routes/renders/__tests__/route.test.ts apps/video-server/src/services/render/providers/remotion/composition/ListingVideo.tsx apps/video-server/src/services/render/providers/remotion/provider.ts
git commit -m "feat: add reel export render endpoint"
```

### Task 6: Integrate, Verify, and Clean Up

**Files:**

- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx`
- Modify: any touched tests from previous tasks

- [ ] **Step 1: Run focused web tests**

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS

Run: `npm test --workspace=@zencourt/web -- apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`
Expected: PASS

Run: `npm test --workspace=@zencourt/web -- apps/web/src/app/api/v1/listings/[listingId]/reels/download/__tests__/route.test.ts`
Expected: PASS

- [ ] **Step 2: Run focused video-server tests**

Run: `npm run test --workspace=@zencourt/video-server -- apps/video-server/src/routes/renders/__tests__/route.test.ts`
Expected: PASS

Run: `npm run test --workspace=@zencourt/video-server -- apps/video-server/src/services/render/domain/__tests__/reelExport.test.ts`
Expected: PASS

- [ ] **Step 3: Run broader regression checks**

Run: `npm run type-check --workspace=@zencourt/web`
Expected: PASS

Run: `npm run test --workspace=@zencourt/video-server`
Expected: PASS or only unrelated pre-existing failures

- [ ] **Step 4: Refactor only where duplication is now obvious**

Allowed cleanup:

- extract tiny shared helper for filename creation
- extract tiny shared helper for button pending-state handling

Do not broaden into unrelated preview-card or clip-manager refactors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx apps/web/src/app/api/v1/listings/[listingId]/reels/download/route.ts apps/video-server/src/routes/renders/route.ts
git commit -m "feat: finish reel preview favorite and download flow"
```

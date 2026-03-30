# Premium Reel Upscale Design

## Goal

Add a premium reel download path in the listing create reel preview modal so users can choose between:

- `Standard download`, which keeps the current reel export workflow
- `Premium 4K download`, which upscales the room clip sources used by the reel, reuses cached upscaled clip URLs when available, and exports the final reel as a background job

The premium path exists to improve vertical-crop quality for room clips generated at `720p`, especially for Google `veo3.1` outputs that appear soft when only a cropped portion of the frame is visible in the reel.

## Current Context

The current reel preview modal in [`apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`](/Users/clada/dev/projects/zencourt/apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx) already supports async reel downloads by:

- building an export payload from the current draft state
- posting that payload to listing-scoped reel export APIs
- polling export status
- downloading the finished artifact once ready

The current server-side reel export flow already exists across `apps/web` and `apps/video-server`:

- `apps/web` owns listing access checks, request validation, and listing-scoped export APIs
- `apps/video-server` owns the render queue and reel export rendering

Current room clip assets are persisted on `video_clip_versions`, and the clip version model layer already supports reads and updates through:

- [`apps/web/src/server/models/video/clips/queries.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/models/video/clips/queries.ts)
- [`apps/web/src/server/models/video/clips/mutations.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/models/video/clips/mutations.ts)

This feature should extend those existing boundaries rather than introduce a parallel premium-only asset model.

## Requirements

### Modal UX

When the user clicks the reel download button in the preview modal:

1. Open a small popup menu anchored to the existing download control.
2. Show:
   - `Standard download`
   - `Premium 4K download`
3. Standard should trigger the current reel export behavior.
4. Premium should trigger a background export job and surface progress in the modal.

The modal must keep a single understandable export state surface. Premium status should distinguish between:

- queued
- upscaling
- rendering
- completed
- failed
- canceled

### Premium Export Behavior

Premium download must:

1. Inspect the room clip versions referenced by the reel export.
2. Reuse `upscaleUrl` from `video_clip_versions` whenever it already exists.
3. Only call WaveSpeed Video Upscaler Pro for clip versions that do not yet have `upscaleUrl`.
4. Persist each completed upscaled asset URL back onto that exact clip version row.
5. Render the reel from the upscaled clip URLs after all required source clips are ready.
6. Download the final premium reel artifact through the same general async export/poll/download pattern already used by the modal.

Premium export must not create a new creative clip version. `upscaleUrl` is a cached derivative of an existing clip version, not a replacement for `videoUrl` and not a new version lineage.

### Cache Reuse Rule

If a clip version already has `upscaleUrl`, premium export must always reuse it. This first version does not include a force-refresh path for premium assets.

### Failure Rule

Premium export should fail as a whole if any required clip cannot be upscaled after retries. The system must not silently mix standard-resolution and premium-resolution clip assets inside the same premium reel export.

Any clip versions that were successfully upscaled before a later failure should keep their persisted `upscaleUrl` values for reuse on subsequent attempts.

## Approaches Considered

### 1. Re-render premium reels from cached upscaled clip URLs

This treats `video_clip_versions` as the source of truth for both original and premium-derived clip assets. Premium export ensures all required `upscaleUrl` values exist, then composes the reel from those URLs.

Pros:

- aligns with the current clip-version data model
- gives reusable upscaled assets for future exports
- avoids repeated WaveSpeed cost when the same clip version appears in multiple reels

Cons:

- adds pre-render orchestration before the export can enter the render phase

### 2. Upscale only the final stitched reel

This would keep clip storage unchanged and send only the final rendered MP4 to an upscaler.

Pros:

- simpler orchestration

Cons:

- does not address the root quality problem as effectively
- cannot recover as much detail as upscaling the source clip before the crop-heavy reel composition

### 3. Persist premium outputs as separate clip versions

This would model upscale as a new version lineage.

Pros:

- explicit history

Cons:

- confuses creative regeneration with resolution derivation
- complicates clip selection and clip history unnecessarily

## Recommended Approach

Use approach 1.

Premium reel export should remain an export-mode concern, not a separate content model. The composition pipeline should choose source asset URLs based on export quality:

- standard export uses clip `videoUrl`
- premium export uses clip `upscaleUrl`, generating and caching it first when missing

This keeps the render layer focused on composing explicit source URLs and keeps the clip-version table as the reusable asset cache.

## Architecture

### 1. Add `upscaleUrl` To `video_clip_versions`

Add a nullable `upscale_url` column to [`packages/db/drizzle/schema/videoClipVersions.ts`](/Users/clada/dev/projects/zencourt/packages/db/drizzle/schema/videoClipVersions.ts) and propagate the generated schema artifacts and types.

This field stores the completed premium asset URL for that specific clip version.

The model layer should support:

- reading `upscaleUrl` with existing clip version queries
- updating `upscaleUrl` via the existing clip version mutation path

No separate premium clip table is needed.

### 2. Extend Reel Export Requests With Quality

The listing-scoped reel export create API should accept a new quality discriminator, for example:

```ts
type ReelExportQuality = "standard" | "premium";
```

The modal should continue building the same canonical export payload it uses today, then attach the selected export quality when the user chooses a download option from the popup menu.

Standard export remains the default path and should preserve current behavior.

### 3. Keep Web Responsibilities In `apps/web`

`apps/web` should continue to own:

- request validation
- listing ownership and access checks
- creation of the listing-scoped export job
- polling and download endpoints
- mapping reel draft segments to trusted clip version records and render contracts

The web layer should never trust client-provided source URLs. Premium export should resolve clip version ids from the authenticated listing context, then pass trusted clip version metadata to `apps/video-server`, including:

- clip version id
- trusted original `videoUrl`
- any render-specific duration or overlay data already derived from the reel draft

`apps/web` should not perform WaveSpeed orchestration or write `upscaleUrl` itself. Its role is to authenticate the request, resolve trusted source records, and hand off the render job payload.

### 4. Add Premium Pre-Render Orchestration In `apps/video-server`

`apps/video-server` should own a new premium-specific orchestration step before render:

1. receive a reel export request with quality metadata and trusted clip version references from `apps/web`
2. if quality is `standard`, proceed directly to render with original clip asset URLs
3. if quality is `premium`:
   - inspect each referenced clip version
   - reuse existing `upscaleUrl` when present
   - submit missing assets to WaveSpeed Video Upscaler Pro
   - poll or await WaveSpeed completion
   - persist completed `upscaleUrl` values back to `video_clip_versions`
   - assemble the render clip list from the premium asset URLs
4. enqueue the reel render once all required source assets are ready

`apps/video-server` is the single owner of premium asset preparation after the listing-scoped request is authenticated. That means:

- `apps/web` resolves and passes trusted clip version ids plus original source URLs
- `apps/video-server` decides whether to reuse `upscaleUrl`, call WaveSpeed, and persist the result

This should be implemented as a dedicated “ensure premium assets exist” step separate from the composition logic.

### 5. Keep Composition URL-Driven

The render composition should not know about WaveSpeed or database persistence. It should receive the final source URLs that correspond to the export mode and render from them.

That separation keeps:

- WaveSpeed integration in premium orchestration
- persistence in clip-version updates
- composition in the existing render domain

### 6. Job Status Model

Premium exports need a clearer phase model than the current generic progress-only messaging. For reel export APIs, the status enum should be:

- `queued`
- `upscaling`
- `rendering`
- `completed`
- `failed`
- `canceled`

For reel export endpoints, `upscaling` and `rendering` replace the previous generic `in-progress` state. The modal should treat both as active in-flight states for polling and progress UI.

Progress may still exist numerically, but the user-facing copy should lead with phase-based status such as:

- `Upscaling room clips...`
- `Rendering premium reel...`

This is more understandable than a single percentage across two different backend activities.

## Data Flow

### Standard Download

1. User clicks the modal download button.
2. User selects `Standard download`.
3. The modal posts the existing reel export payload plus `quality: "standard"`.
4. `apps/web` validates the request and creates the export job.
5. `apps/video-server` renders from the original clip asset URLs.
6. The modal polls status and automatically downloads the finished artifact when ready.

### Premium 4K Download

1. User clicks the modal download button.
2. User selects `Premium 4K download`.
3. The modal posts the reel export payload plus `quality: "premium"`.
4. `apps/web` validates access and resolves the reel’s referenced clip versions.
5. `apps/video-server` starts the background job.
6. For each referenced clip version:
   - if `upscaleUrl` exists, reuse it
   - otherwise call WaveSpeed Video Upscaler Pro with the original `videoUrl`
   - await completion
   - persist the resulting `upscaleUrl`
7. Once all required premium clip assets exist, `apps/video-server` renders the reel from those premium URLs.
8. The modal polls job status through `upscaling` and `rendering`.
9. When the artifact is ready, the existing download path retrieves the final premium MP4.

## Error Handling

### Request Validation

- Reject premium export if any referenced reel segment cannot be resolved to a valid room clip version.
- Reject premium export if a required clip version has no usable original `videoUrl`.
- Reject requests with no valid renderable segments before creating upstream work.

### Premium Upscaling

- Retry WaveSpeed requests using a bounded retry policy.
- If any required clip fails to upscale after retries, mark the export as failed.
- Do not fall back to mixed standard/premium source clips in a premium export.
- Preserve any already-persisted `upscaleUrl` values from successful earlier clip upscales.

### Rendering

- If render fails after all premium assets are ready, fail the export job without clearing cached `upscaleUrl`s.
- Standard export must never invoke the premium upscale path.

### UX Behavior

- Prevent duplicate export starts while the same reel preview already has an in-flight export.
- Surface clear modal error text and toast messages for premium failures.
- Keep the existing auto-download-on-completion behavior once the artifact is ready.

## Testing

### Web Component Tests

Update modal tests to cover:

- opening the download popup menu from the existing download button
- rendering `Standard download` and `Premium 4K download`
- posting `quality: "standard"` for standard export
- posting `quality: "premium"` for premium export
- showing premium phase-based status copy while polling

### Web Route And Action Tests

Add tests for:

- request parsing and validation for the new export quality field
- listing access checks remaining unchanged for both qualities
- mapping reel draft segments to trusted clip version references for premium export
- status and artifact endpoints returning the reel export status enum correctly, with `upscaling` and `rendering` replacing generic `in-progress`

### Model And Schema Tests

Add or update tests for:

- `video_clip_versions` including `upscaleUrl`
- updating a clip version with a completed `upscaleUrl`
- reading cached `upscaleUrl` through the existing query path

### Video-Server Tests

Add tests for:

- premium export reusing cached `upscaleUrl`
- missing `upscaleUrl` triggering WaveSpeed submission
- completed WaveSpeed results persisting `upscaleUrl`
- premium export failing when any required upscale fails
- standard export bypassing premium orchestration entirely
- premium render input using upscaled source URLs after preparation completes

## File And Boundary Expectations

Likely schema and shared type changes:

- `packages/db/drizzle/schema/videoClipVersions.ts`
- generated migration artifacts from `npm run db:generate`
- any affected DB/shared type exports

Likely web files:

- `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- existing listing-scoped reel export routes under `apps/web/src/app/api/v1/listings/[listingId]/reels/`
- reel export request/domain helpers in `apps/web`
- clip version model helpers in `apps/web/src/server/models/video/clips/`

Likely video-server files:

- `apps/video-server/src/routes/renders/domain/reelExportRequests.ts`
- `apps/video-server/src/routes/renders/route.ts`
- new premium export orchestration under `apps/video-server/src/services/render/` or adjacent domain modules
- WaveSpeed integration helpers in a dedicated video-server service/domain module

## Non-Goals

- Upscaling every generated clip by default
- Adding a user-facing force-refresh control for existing `upscaleUrl` values
- Creating separate premium clip versions
- Replacing the current standard reel export flow
- Silently falling back from premium export to standard quality

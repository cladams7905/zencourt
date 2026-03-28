# Reel Preview Download And Favorite Design

## Goal

Add `Download` and `Favorite` controls to the reel preview modal so users can:

- export the reel exactly as it appears in the modal, including dirty unsaved edits, as an on-demand browser download
- save the current dirty draft first and then mark that saved reel content item as `isFavorite=true`

The export must not update the saved `contentUrl` or `thumbnailUrl` on the associated content record.

## Current Context

The reel preview modal in [`apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`](/Users/clada/dev/projects/zencourt/apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx) already owns the draft state for:

- hook
- caption
- overlay settings
- reel sequence ordering
- segment durations

Saved reel edits currently flow through [`saveListingVideoReel`](/Users/clada/dev/projects/zencourt/apps/web/src/server/actions/listings/content/reels/actions.ts), which:

- creates a new `content` row when the reel still points at cached generated content
- updates an existing `content` row when the reel already maps to saved content

The existing clip manager download flow is useful as a pattern, not as the core implementation:

- the final browser download trigger can reuse the anchor-click pattern after a blob URL is created
- the API route shape that streams a file with `Content-Disposition` can be reused
- the existing clip download endpoint cannot be reused directly because it only downloads already-rendered persisted clip assets by `clipVersionId`

The repo already has a server-side Remotion render path in `apps/video-server`, so on-demand reel export should build on that instead of introducing client-side rendering.

## Requirements

### Modal UI

Add `Download` and `Favorite` icon buttons in the top-right corner of the `bg-secondary` video player container in the reel preview modal.

The controls must:

- remain scoped to the modal, not only the preview grid cards
- show pending/disabled state while their action is in flight
- preserve existing modal editing behavior
- surface failures via the existing toast/error patterns

### Favorite Behavior

When the user clicks `Favorite`:

1. Build a payload from the current modal draft state.
2. Save the draft first.
3. If the reel points at cached generated content, create a new saved reel content row.
4. If the reel points at an existing saved reel, update that content row with the current draft.
5. After save succeeds, update the saved content row to `isFavorite=true`.
6. Return the updated saved content item so the listing create UI can replace the preview item and keep local state in sync.

This flow must always favorite the saved version produced from the current dirty draft, never an older persisted version.

### Download Behavior

When the user clicks `Download`:

1. Build a payload from the current modal draft state.
2. Send the draft to a dedicated reel export endpoint.
3. Resolve the underlying clip sources from the draft sequence.
4. Render the reel server-side so the output matches the modal state.
5. Stream the generated MP4 back with attachment headers so the browser downloads it.

The export is transient:

- it does not create or update `contentUrl`
- it does not create or update `thumbnailUrl`
- it does not require the reel to be favorited or explicitly saved first

## Recommended Approach

Use a dedicated reel export route plus a separate favorite mutation.

This keeps the responsibilities distinct:

- persistence and favoriting remain web-side content mutations
- download remains an HTTP file response
- rendering remains in the video server

This approach follows the existing layering in the monorepo and avoids overloading `saveListingVideoReel` with transient export concerns.

## Architecture

### 1. Shared Draft Payload Builder In The Modal

The modal should have one internal helper that converts current draft state into the canonical reel draft payload:

- hook
- caption
- overlay background
- overlay position
- overlay font pairing
- show address flag
- normalized sequence with source ids and durations
- save target metadata when available

This helper becomes the single source for:

- save
- favorite
- download

That prevents drift between the persisted reel shape and exported reel shape.

`ListingVideoPreviewGrid` should pass `listingId` into `VideoPreviewModal` so the modal can call the new listing-scoped favorite and download paths directly.

### 2. Favorite Mutation Path

Add a reel-specific server action that orchestrates:

- draft normalization and validation
- save-first behavior
- favorite update on the resulting saved content row

Recommended structure:

- reuse `saveListingVideoReel` internals where possible
- add a focused action such as `saveAndFavoriteListingVideoReel`
- keep DB writes in the existing content model layer via `createContent` and `updateContent`

The action should return the mapped saved reel content item so the caller can update the local preview dataset without reloading the entire screen.

### 3. Download Route Pattern

Add a new download route for reel draft export. This should mirror the clip manager route pattern at a high level:

- parse route params
- validate user access
- obtain a render result or temporary upstream URL
- return a `NextResponse` with `Content-Disposition`

The route differs from the clip manager route because it must accept and validate draft input rather than a persisted clip version id.

Recommended shape:

- `POST /api/v1/listings/[listingId]/reels/download`

Reasoning:

- the request needs a body containing draft state
- the response needs to stream a file
- keeping it under listing-scoped API routes matches existing organization

The web route should accept a reduced export-specific schema, not the full generic modal save input. The route body should contain only what export needs:

- `segments`: ordered draft segments
- `filenameBase`: optional human-readable filename seed

Each draft segment should include:

- `sourceType`
- `sourceId`
- `durationSeconds`
- `textOverlay`
- `supplementalAddressOverlay`

The client must not send raw source URLs for rendering. The web server remains responsible for resolving trusted video URLs from the authenticated listing context.

The client submission mechanism should be:

1. `fetch()` the `POST` download route with the reduced draft export payload
2. read the response as a `Blob`
3. create an object URL
4. trigger download with a temporary anchor element
5. revoke the object URL after the click

This is the part that reuses the clip manager’s browser download trigger pattern. The route remains responsible for setting `Content-Disposition`, and the client may optionally reuse that filename when assigning `anchor.download`.

The reduced export payload should be derived from the same canonical normalized draft used by save and favorite, so all three actions stay aligned on sequence ordering, durations, and overlay state.

### 4. Web-Side Export Orchestration

The web layer should translate the modal draft payload into a render request for the video server:

- verify listing access
- resolve referenced clip sources from saved listing clips and user media
- confirm every draft segment has a valid renderable video URL
- map modal overlay state into the render contract
- generate a user-friendly filename

This orchestration should live in a server action or service used by the route, not in the route itself.

### 5. Video-Server Render Contract

Add a dedicated render contract for reel draft export that accepts:

- a generated export id
- orientation
- ordered clips with source URLs and exact durations
- primary text overlay data
- supplemental address overlay data when present

The render path should use the existing Remotion provider and composition pipeline in `apps/video-server`, but it must be able to render from explicit draft clips rather than only previously persisted/generated records.

The existing `POST /renders` contract must not be reused for this feature. That endpoint is queue-based and tied to a persisted `videoId`, while reel modal export is:

- synchronous from the user’s perspective
- driven by dirty draft state
- not associated with a persisted render job or saved asset

Recommended dedicated endpoint:

- `POST /renders/reel-export`

Recommended request payload from web to video server:

```ts
type VideoServerReelExportRequest = {
  exportId: string;
  orientation: "vertical";
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

Recommended response:

- success: `200`
- body: streamed `video/mp4`
- headers: `Content-Type: video/mp4`

This keeps listing access control and source resolution in `apps/web`, while `apps/video-server` stays focused on rendering an explicit composition payload.

## Reuse Boundaries

### Reuse

- Client download trigger pattern from the listing clip manager.
- HTTP streaming response pattern from the clip download API route.
- Existing reel save normalization and validation logic.
- Existing content model mutation helpers.
- Existing Remotion provider and composition infrastructure.

### Do Not Reuse Directly

- The existing clip download endpoint keyed by `clipVersionId`.
- Any flow that assumes a persisted `contentUrl`.
- The preview grid’s local-only favorite `Set`, which does not persist anything.

## Data Flow

### Favorite Click

1. User clicks favorite in the modal.
2. Modal builds current reel draft payload.
3. Client calls `saveAndFavoriteListingVideoReel`.
4. Server action normalizes and validates the draft.
5. Server action saves the reel:
   - cached draft becomes new content
   - saved content becomes updated content
6. Server action updates `isFavorite=true` on the resulting content id.
7. Server action returns the updated mapped content item.
8. Parent listing create state replaces the old preview item in `items` or `captionItems`, matching the existing `onReplacePreviewItem` pattern.
9. `buildPlayablePreviews(...)` recomputes from the updated content item and derives the new favorite state for both the modal and the grid from persisted content instead of modal-local favorite toggles.

### Download Click

1. User clicks download in the modal.
2. Modal builds current reel draft payload.
3. Client posts the payload to the new reel download route with `fetch`.
4. Route validates params and access.
5. Route delegates to export orchestration.
6. Orchestration resolves trusted clip source URLs and builds `VideoServerReelExportRequest`.
7. Web server posts that payload to `POST /renders/reel-export` on the video server using the existing server-to-server auth mechanism.
8. Video server renders MP4 from the explicit clip payload and streams it back.
9. Web route forwards the upstream stream as an attachment response.
10. Client reads the response blob, creates an object URL, and triggers the final anchor-based browser download.
11. Browser download starts.

## Error Handling

### Favorite

- If the draft is invalid, fail before any DB mutation.
- If save fails, do not attempt to favorite.
- If save succeeds and favorite update fails, report the failure and keep the saved edit intact.
- Disable repeated clicks while the mutation is in flight.

### Download

- If any referenced clip source cannot be resolved, fail with a user-facing error.
- If the draft contains no valid segments, fail before render.
- If video-server render fails, return a download failure without mutating saved content.
- Disable repeated clicks while the export is in flight.

## Testing

### Web Component Tests

Update modal tests to cover:

- rendering of download and favorite controls in the modal player container
- favorite click calling save-first flow with dirty draft values
- download click sending dirty draft values to the export route
- pending states disabling repeated actions

### Web Action And Route Tests

Add tests for:

- cached reel draft save-then-favorite
- saved reel update-then-favorite
- favorite flow preserving dirty draft edits
- export route request validation
- export route streaming response headers
- export route error mapping for missing sources and render failures
- export payload mapping from web draft segments to video-server request

### Video-Server Tests

Add tests for:

- mapping draft sequence into render clips in the requested order
- preserving requested durations
- including primary overlays
- including supplemental address overlays when present
- request parsing for `POST /renders/reel-export`

## File And Boundary Expectations

Likely web files:

- `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- `apps/web/src/components/listings/create/components/ListingVideoPreviewGrid.tsx`
- `apps/web/src/server/actions/listings/content/reels/actions.ts`
- `apps/web/src/app/api/v1/listings/[listingId]/reels/download/route.ts`
- a new reel export helper/service module under `apps/web/src/server/actions/listings/content/reels/` or `apps/web/src/server/services/`

Likely video-server files:

- render-domain mapping helpers under `apps/video-server/src/services/render/domain/`
- render orchestration or route handlers that accept draft reel input
- tests adjacent to the new mapping/orchestration files

## Non-Goals

- Persisting exported asset URLs back onto content.
- Reusing the clip manager download endpoint directly for reel exports.
- Refactoring unrelated preview grid behavior beyond what is needed to keep favorite state accurate after save.

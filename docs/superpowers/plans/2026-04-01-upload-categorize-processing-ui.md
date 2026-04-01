# Upload → Categorize AI Processing UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the user clicks Continue on the listing upload stage, show an **inline** processing experience (photo grid + blurred overlay + AI progress) **inside the upload stage**, then navigate to the categorize stage after every image in the batch has finished room classification (success or failure). **Do not** use a separate `/stage/categorize/processing` route.

**Architecture:** Extract a **presentational** categorize-processing panel (grid + overlay + `Progress` + copy) and mount it from `ListingUploadView` as the **main content** of `ListingStageShell` while AI runs. Reuse the same polling + completion logic (`useCategorizeProcessingFlow` or a thin wrapper), but track the active batch by the **created image IDs returned from `createListingImageRecordsForCurrentUser`**, not by `batchStartedAt` comparisons. Keep `batchStartedAt` only as optional display/debug metadata if useful. Persist the active processing batch in **`sessionStorage` keyed by `listingId`** so refresh/navigation can resume the inline processor without a URL param. **Shell rules:** Keep `ListingStageViewHeader` and the stage **timeline** (`ListingStageScaffold` steps) visible; **hide the footer** (Back / Continue) for the duration of processing so only the inner area swaps. On completion, `router.push` (or `replace`) to `/listings/[listingId]/stage/categorize`.

**Backend alignment (already in repo):** Listing image analysis is **job-queue style** in `runListingImagesCategorizationWorkflow` (`apps/web/src/server/actions/listings/image/categorize/helpers.ts`): rows use **`analysisStatus`** (`pending` → `processing` → `complete` | `failed`), **`analysisRunId`**, **`analysisStartedAt` / `analysisCompletedAt`**, and **stale reclaim** (`ANALYSIS_STALE_MS`, currently 10 minutes) for stuck `processing` rows. **Room classification** lives under `apps/web/src/server/services/roomClassification/` (structured JSON: category, confidence, `shotType`, score breakdown, etc.). Failures persist as `analysisStatus: "failed"` and `metadata.analysisError` (see `mapBatchResultToImage`). The client **`useCategorizeProcessingFlow`** already treats an image as terminal when `analysisStatus === "complete" || analysisStatus === "failed"` — do **not** reintroduce category/`primaryScore`-only heuristics; extend types/API if the grid needs **`id`**, **`url`**, **`shotType`**, **`recommendationScore`**.

**Remove:** The App Router page at `apps/web/src/app/(dashboard)/listings/[listingId]/stage/categorize/processing/page.tsx` and **delete or replace** `buildProcessingRoute` and all navigations to that URL (`useUploadFlow`, `useCategorizeUploads`).

**Tech Stack:** Next.js App Router, React client components, SWR, existing server actions (`createListingImageRecordsForCurrentUser`, `categorizeListingImagesForCurrentUser`, `updateListingForCurrentUser`), `@web/src/components/ui/progress`, Tailwind (`backdrop-blur`, overlays).

---

## Context (read first)

| Area | Current behavior |
|------|-------------------|
| `ListingUploadView` `handleContinue` | Sets client draft store, updates stage to `categorize`, `router.push` to **categorize main** — **skips** AI processing UX and does **not** run the same upload pipeline as `useCategorizeUploads`. |
| `/stage/categorize/processing` | Renders `ListingProcessingView` (`mode="categorize"`). **To be removed** — processing moves inline on upload (and see below for other callers). |
| `buildProcessingRoute` + `useUploadFlow` / `useCategorizeUploads` | Navigate to the processing route after uploads — **must change** when the route is deleted. |
| `categorizeListingImagesForCurrentUser` → `runListingImagesCategorizationWorkflow` | Loads DB rows, selects **claimable** images (`pending`, or `processing` older than stale window), **claims** them (`analysisStatus = processing`, new `analysisRunId`), runs `roomClassificationService.classifyRoomBatch`, persists per-image via `onProgress` + final persist. **No-op** if nothing is claimable (e.g. all `complete` / `failed`, or concurrent run holds rows). |
| `useCategorizeProcessingFlow` | Polls `GET /api/v1/listings/:id/images`, calls `triggerCategorization` once when images exist, navigates when every image in the batch has `analysisStatus` **`complete` or `failed`**. **Keep** this completion rule; **change** batch identity from timestamp filtering to **created image IDs**, and change container: inline on upload, parent-driven `navigate`. |
| Older plan assumptions | ~~`needsAnalysis` via `!category`~~, ~~confidence sentinels~~ — **superseded** by `analysisStatus` + failed metadata. Only add DB/API work if you discover a gap vs. the queue model. |

---

## Shell layout (upload stage, while processing)

`ListingStageShell` (`apps/web/src/components/listings/stage/shared/ListingStageShell.tsx`) composes:

- **Always visible during processing:** `ListingStageViewHeader`, `ListingStageScaffold` **steps** (timeline), step title/subtitle for the upload stage.
- **Hidden during processing:** footer — pass **`footer={null}`** (or equivalent) so `ListingStageFooter` (Back / Continue) is not rendered. Do **not** hide the scaffold header/timeline.

Implementation note: `ListingStageShell` treats `footer` as optional; pass `footer={isProcessing ? null : <ListingStageFooter ... />}` (exact pattern subject to existing props).

---

## File map

| Responsibility | Files |
|----------------|--------|
| Inline processing + footer gating | `apps/web/src/components/listings/stage/upload/ListingUploadView.tsx` |
| Upload batch helper (optional extract) | `apps/web/src/components/listings/stage/upload/domain/` |
| Presentational panel (new or extracted) | e.g. `apps/web/src/components/listings/stage/upload/subcomponents/ListingUploadAiProcessingPanel.tsx` **or** shared under `stage/processing/` if reused |
| Processing hook | `apps/web/src/components/listings/stage/processing/domain/hooks/useCategorizeProcessingFlow.ts` (refactor for non-route use + expose progress using `batchImageIds`) |
| Orchestrator (review/generate only if still needed) | `apps/web/src/components/listings/stage/processing/domain/hooks/useListingProcessingWorkflow.ts`, `ListingProcessingView.tsx` — **categorize mode** may be removed from here if unused |
| API client | `apps/web/src/components/listings/stage/processing/domain/transport.ts` |
| Server workflow + classification | `apps/web/src/server/actions/listings/image/categorize/helpers.ts`; `apps/web/src/server/services/roomClassification/` |
| **Remove** | `apps/web/src/app/(dashboard)/listings/[listingId]/stage/categorize/processing/page.tsx` |
| **Update / remove** | `buildProcessingRoute` in `apps/web/src/components/listings/stage/upload/domain/utils.ts`; `useUploadFlow.ts`; `useCategorizeUploads.ts`; draft upload store read/write paths + tests |

---

### Task 1: Server — verify analysis queue + terminal persistence (adjust scope)

**Files:**

- Review (modify only if gaps): `apps/web/src/server/actions/listings/image/categorize/helpers.ts`
- Schema reference: `packages/db/drizzle/schema/listingImages.ts`, `listingImageAnalysisStatusEnum` in `packages/db/drizzle/schema/enums.ts`

**Note:** The queue already distinguishes **terminal** outcomes via `analysisStatus` (`complete` | `failed`) and optional `metadata.analysisError`. **Do not** duplicate the old “`!category` / confidence sentinel” plan unless integration tests show a hole.

- [ ] **Step 1: Confirm claim + lifecycle**

  Trace one run: new uploads → `pending` → claim → `processing` → per-image persist → final `complete`/`failed`. Confirm `getClaimableImages` / stale reclaim behavior matches product expectations (document `ANALYSIS_STALE_MS` for support/debug).

- [ ] **Step 2: Confirm failure path**

  Ensure `mapBatchResultToImage` failures and missing public URL paths persist **`failed`** (or equivalent terminal state) so the client can finish the batch without hanging.

- [ ] **Step 3: Run server tests**

  Run: `pnpm exec vitest run apps/web/src/server/actions/listings/image/categorize` and `pnpm exec vitest run apps/web/src/server/services/roomClassification` (paths per repo layout).

  Expected: PASS.

- [ ] **Step 4: Commit** (only if you changed code)

  ```bash
  git add apps/web/src/server/actions/listings/image/categorize/helpers.ts
  git commit -m "fix(listings): tighten image analysis queue edge cases (if any)"
  ```

---

### Task 2: Client transport — image payload for grid + batch progress

**Files:**

- Modify: `apps/web/src/components/listings/stage/processing/domain/transport.ts`

- [ ] **Step 1: Type `fetchListingImages` for UI + queue state**

  Include at least: `id`, `url`, `filename`, `uploadedAt`, `category`, `confidence`, **`recommendationScore`** (not legacy `primaryScore`), **`analysisStatus`**, **`shotType`** if exposed by API — match `GET /api/v1/listings/:id/images` / `DBListingImage` subset.

- [ ] **Step 2: Pure helper for batch progress**

  `countTerminalInBatch(images, batchImageIds)` where **terminal** means `analysisStatus === "complete" || analysisStatus === "failed"`. Filter batch membership by the explicit set of created image IDs, not `uploadedAt >= batchStartedAt`. Optionally count **`processing`** separately if the overlay should show “in flight” (e.g. sublabel or per-thumb state).

- [ ] **Step 3: Commit**

  ```bash
  git add apps/web/src/components/listings/stage/processing/domain/transport.ts
  git commit -m "feat(listings): full image fields + batch progress helpers for processing UI"
  ```

---

### Task 3: `useCategorizeProcessingFlow` — progress + completion (no processing route)

**Files:**

- Modify: `apps/web/src/components/listings/stage/processing/domain/hooks/useCategorizeProcessingFlow.ts`
- Modify tests: `apps/web/src/components/listings/stage/processing/domain/__tests__/useCategorizeProcessingFlow.test.tsx`

**Note:** Completion detection **`analysisStatus === "complete" || "failed"`** is already present — extend with **counts** and **inline** integration rather than rewriting terminal logic. Also stop using client timestamps as the batch boundary; use the IDs returned from record creation.

- [ ] **Step 1: Expose derived state for the inline panel**

  Return e.g. `{ batchTotal, batchCompleted, batchImages, progress, isComplete }` where `progress = batchCompleted / batchTotal` (terminal / total in batch), and `batchImages` is filtered by **`batchImageIds` from hook params**. `batchStartedAt` may still be accepted only for copy/debug, not membership.

- [ ] **Step 2: Completion navigation**

  When all batch images are terminal, invoke **`navigate('/listings/:id/stage/categorize')`** or parent `onComplete` — same as today, without requiring a processing page.

- [ ] **Step 3: Single `triggerCategorization` call**

  Preserve `hasTriggeredCategorizeRef` so the server action is not spammed; the workflow is idempotent for already-complete rows but still costs a round-trip.

- [ ] **Step 4: Gate polling**

  Only poll when the hook is “active” (e.g. `enabled: Boolean(batchImageIds.length && listingId)`), so idle upload pages do not hit the images API.

- [ ] **Step 5: Resume after refresh/navigation**

  Persist `{ batchImageIds, batchStartedAt? }` in `sessionStorage` under a `listingId`-scoped key when processing starts. On mount, if an unfinished batch exists, resume polling and rendering the inline panel. Clear storage when the batch reaches a terminal state or when the user leaves the flow intentionally.

- [ ] **Step 6: Optional — stuck `processing`**

  If UX requires it, surface copy when batch images stay `processing` longer than expected (queue worker delay, not stale yet). Otherwise rely on existing stale reclaim on the server.

- [ ] **Step 7: Run tests**

  Run: `npm test --workspace=@zencourt/web -- --runTestsByPath src/components/listings/stage/processing/domain/__tests__/useCategorizeProcessingFlow.test.tsx`

  Expected: PASS (update fixtures to include `analysisStatus` where needed).

- [ ] **Step 8: Commit**

  ```bash
  git add apps/web/src/components/listings/stage/processing/domain/hooks/useCategorizeProcessingFlow.ts \
    apps/web/src/components/listings/stage/processing/domain/__tests__/useCategorizeProcessingFlow.test.tsx
  git commit -m "feat(listings): categorize processing progress without processing route"
  ```

---

### Task 4: Presentational panel + slim `ListingProcessingView` (categorize)

**Files:**

- Create (suggested): `apps/web/src/components/listings/stage/upload/subcomponents/ListingUploadAiProcessingPanel.tsx` (or shared path) — **pure UI**: grid, blur overlay, title **"Analyzing your listing photos with AI"**, `Progress`, **`(batchCompleted/batchTotal images processed)`**
- Modify: `apps/web/src/components/listings/stage/processing/ListingProcessingView.tsx` and `useListingProcessingWorkflow.ts` — **remove categorize mode** from the full-page card if nothing else uses it, **or** have it import the same presentational panel for consistency (prefer **one** component).

- [ ] **Step 1: Build the grid + overlay layout**

  Responsive image grid (URLs from API), centered overlay with `backdrop-blur`, semantic heading hierarchy. Per-thumb **optional:** subtle state for `pending` / `processing` / `complete` / `failed` using `analysisStatus` (matches backend queue).

- [ ] **Step 2: Loading / empty states**

  Until the first poll returns any batch images, show skeleton or spinner inside the content region (still inside shell). If the active batch is known but the API has not returned those IDs yet, treat that as a transient loading state rather than “no work”.

- [ ] **Step 3: Review / generate**

  Ensure **review** and **generate** processing UIs in `ListingProcessingView` remain unchanged.

- [ ] **Step 4: Commit**

  ```bash
  git add apps/web/src/components/listings/stage/upload/subcomponents/ \
    apps/web/src/components/listings/stage/processing/
  git commit -m "feat(listings): shared AI processing panel layout for categorize"
  ```

---

### Task 5: `ListingUploadView` — upload, inline processing, shell behavior, then route to categorize

**Files:**

- Modify: `apps/web/src/components/listings/stage/upload/ListingUploadView.tsx`
- Possibly extract: `apps/web/src/components/listings/stage/upload/domain/uploadPendingListingImages.ts` (or similar)

- [ ] **Step 1: State machine**

  Add e.g. `phase: 'editing' | 'uploading' | 'analyzing'` (names flexible). On Continue: set `uploading` → run upload pipeline → set `listingStage` to `categorize` → set `analyzing` with **`batchImageIds` returned from record creation** (and optional `batchStartedAt`) + mount processing hook/panel.

- [ ] **Step 2: Upload all `pendingFiles`**

  Same as before: `getListingImageUploadUrlsForCurrentUser` → PUT → `buildListingUploadRecordInput` → `createListingImageRecordsForCurrentUser`. Capture the returned created rows and derive the active batch from their **IDs**. New rows should get **`analysisStatus: "pending"`** (DB default) before `triggerCategorization` runs.

- [ ] **Step 3: Footer + content swap**

  When `phase === 'analyzing'`: **`footer={null}`** so Back and Continue are hidden; **replace** the main children (dropzone / photo grid) with `ListingUploadAiProcessingPanel` wired to `useCategorizeProcessingFlow`. Header + timeline remain via `ListingStageShell`.

- [ ] **Step 4: Completion**

  When the hook reports all batch images terminal: `router.push` or `router.replace` to `/listings/[listingId]/stage/categorize`. Do **not** navigate to a processing URL.

- [ ] **Step 5: Draft store**

  Remove `setListingUploadDraftImages` on Continue when images are persisted server-side (draft path no longer needed for this flow), and remove the corresponding draft-image hydration path from `ListingCategorizeView` so stale client-only draft images cannot reappear.

- [ ] **Step 6: Refresh recovery**

  If the upload stage reloads during `analyzing`, rehydrate the active batch from `sessionStorage` and resume the inline processor instead of dropping the user back into a normal editing state while the server job is still running.

- [ ] **Step 7: Tests**

  Component/integration tests for footer visibility and phase transitions if the repo pattern supports it.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/web/src/components/listings/stage/upload/
  git commit -m "feat(listings): inline AI processing on upload stage with shell rules"
  ```

---

### Task 6: Remove processing route; fix `useUploadFlow`, `useCategorizeUploads`, and `buildProcessingRoute`

**Files:**

- Delete: `apps/web/src/app/(dashboard)/listings/[listingId]/stage/categorize/processing/page.tsx`
- Modify: `apps/web/src/components/listings/stage/upload/domain/hooks/useUploadFlow.ts` — **`onUploadsComplete` must not** `navigate(buildProcessingRoute(...))`; instead call a **callback** from `ListingUploadView` with the created batch image IDs (and optional `batchStartedAt`) so “Upload more” dialog completion triggers inline processing.
- Modify: `apps/web/src/components/listings/stage/categorize/domain/hooks/useCategorizeUploads.ts` — **do not** navigate to removed route; **inline** the same processing panel in `ListingCategorizeView` with explicit local state + the shared processing hook/panel. Do **not** use `router.refresh` as the primary UX.
- Modify/remove: `buildProcessingRoute` and `utils.test.ts` / `useUploadFlow.test.tsx` / `useCategorizeUploads.test.tsx`
- Modify/remove: client upload draft-store integration in `ListingCategorizeView` and any other callers that depended on the processing route handoff
- Grep for `categorize/processing` and remove stale links.

- [ ] **Step 1: Delete route file**

- [ ] **Step 2: Refactor upload flow navigation**

- [ ] **Step 3: Refactor categorize uploads**

  Reuse the same presentational panel + processing hook in `ListingCategorizeView` so “Upload more” on the categorize page uses the same inline analyzing UX instead of navigating away or refreshing the full route.

- [ ] **Step 4: Run tests** — `npm test --workspace=@zencourt/web -- --runTestsByPath ...` for affected suites.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/app apps/web/src/components/listings/stage/upload apps/web/src/components/listings/stage/categorize
  git commit -m "refactor(listings): remove categorize processing route; inline processing callers"
  ```

---

## Testing checklist (before merge)

- [ ] Upload ≥3 images → Continue → **same URL** (upload stage) shows inline grid + overlay + progress; **header + timeline** visible; **no** Back/Continue until done → lands on categorize.
- [ ] “Upload more” flow (if applicable) triggers **inline** processing, not a missing route.
- [ ] Upload from categorize dialog: no 404 / no navigation to deleted route; processing UX still acceptable.
- [ ] Refresh during inline processing resumes the same batch instead of losing the in-flight state.
- [ ] Batch completes when every image is **`analysisStatus` `complete` or `failed`** (queue model), including classifier failures persisted as `failed`.
- [ ] Batch membership is determined by the returned created image IDs, not by client/server timestamp comparisons.
- [ ] Optional: forced / stale `processing` behavior aligns with `ANALYSIS_STALE_MS` reclaim (no infinite spinner if server recovers a stuck row).

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-01-upload-categorize-processing-ui.md`. Two execution options:

**1. Subagent-driven (recommended)** — Fresh subagent per task, review between tasks.

**2. Inline execution** — Execute tasks in this session using executing-plans with checkpoints.

**Which approach?**

---

## References

- @superpowers:subagent-driven-development
- @superpowers:executing-plans
- @superpowers:verification-before-completion

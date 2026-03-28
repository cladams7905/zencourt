# Reel Preview Overlay Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add overlay-style controls to the reel preview modal so users can draft and save text overlay background, position, font, and address visibility alongside existing reel edits.

**Architecture:** Keep overlay controls in the modal’s existing draft state and introduce a small helper module to seed and apply overlay draft values to preview segments. Persist explicit overlay settings through the existing reel save flow and prefer saved settings over random seeded defaults when rebuilding previews.

**Tech Stack:** React, TypeScript, Jest, Next.js app code, shared text-overlay utilities, existing listing content save/cache actions

---

## File Structure

### New files

- Create: `apps/web/src/components/listings/create/media/video/components/videoPreviewOverlayControls.ts`
  - overlay option metadata for backgrounds, positions, and user-facing font labels
  - modal overlay draft type
  - helpers to seed a draft from a preview and apply it back onto draft segments

- Create: `apps/web/src/components/listings/create/media/video/components/__tests__/videoPreviewOverlayControls.test.ts`
  - unit tests for overlay draft seeding and application logic

### Existing files to modify

- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx`
  - render the new overlay controls UI in the right column

- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
  - own overlay draft state
  - seed/reset/dirty handling
  - apply overlay draft to preview segments
  - include overlay settings in save payload

- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
  - cover render, dirty/reset behavior, preview updates, and save payload

- Modify: `apps/web/src/lib/domain/listings/content/create.ts`
  - extend `PlayablePreviewTextUpdate`

- Modify: `apps/web/src/lib/domain/listings/content/index.ts`
  - extend saved content item metadata typing with persisted overlay settings

- Modify: `apps/web/src/lib/domain/listings/content/createPreviewPlans.ts`
  - prefer saved overlay settings over random seeding when present

- Modify: `apps/web/src/components/listings/create/media/video/videoPreviewViewModel.ts`
  - expose or reuse overlay-building logic cleanly for saved overrides if needed

- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
  - validate and normalize overlay settings in the save action flow

- Modify: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`
  - verify overlay settings are accepted and forwarded

- Modify: `apps/web/src/server/infra/cache/listingContent/types.ts`
  - include overlay setting fields in cache-layer contracts

- Modify: `apps/web/src/server/infra/cache/listingContent/cache.ts`
  - persist and read overlay setting fields

- Modify: `apps/web/src/server/infra/cache/listingContent/__tests__/cache.test.ts`
  - verify overlay settings round-trip through cache writes/reads

- Modify: `apps/web/src/components/listings/create/media/video/__tests__/videoPreviewViewModel.test.ts`
  - verify saved overlay settings override seeded randomness after reopen

---

### Task 1: Add Overlay Draft Helper and Metadata

**Files:**
- Create: `apps/web/src/components/listings/create/media/video/components/videoPreviewOverlayControls.ts`
- Test: `apps/web/src/components/listings/create/media/video/components/__tests__/videoPreviewOverlayControls.test.ts`
- Reference: `apps/web/src/components/listings/create/media/video/videoPreviewViewModel.ts`
- Reference: `packages/shared/types/video/textOverlay.ts`
- Reference: `packages/shared/utils/textOverlay/assets/variants.ts`
- Reference: `packages/shared/utils/textOverlay/assets/fonts.ts`

- [ ] **Step 1: Write the failing helper tests**

Add tests for:
- seeding overlay draft from a preview with `textOverlay` and `supplementalAddressOverlay`
- applying a changed background/position/font draft to all segment overlays
- removing address overlays when `showAddress` is false
- returning user-facing font option labels mapped to internal `fontPairing` ids

Run: `npm test --workspace=@zencourt/web -- videoPreviewOverlayControls.test.ts`
Expected: FAIL because the helper module does not exist yet

- [ ] **Step 2: Create the overlay helper module with minimal metadata**

Implement:
- `ReelOverlayDraft`
- `VIDEO_PREVIEW_OVERLAY_BACKGROUND_OPTIONS`
- `VIDEO_PREVIEW_OVERLAY_POSITION_OPTIONS`
- `VIDEO_PREVIEW_OVERLAY_FONT_OPTIONS`
- `seedOverlayDraftFromPreview(preview)`
- `applyOverlayDraftToSegments(...)`

Keep the implementation small and reuse current overlay fields instead of inventing new types.

- [ ] **Step 3: Run the helper tests to verify they pass**

Run: `npm test --workspace=@zencourt/web -- videoPreviewOverlayControls.test.ts`
Expected: PASS

- [ ] **Step 4: Refactor only if needed**

If helper code duplicates existing overlay-generation pieces, extract only the minimum shared helper needed for address overlay rebuilding or overlay field replacement.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/videoPreviewOverlayControls.ts apps/web/src/components/listings/create/media/video/components/__tests__/videoPreviewOverlayControls.test.ts
git commit -m "feat: add reel preview overlay draft helpers"
```

### Task 2: Add Overlay Controls UI to the Right Column

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx`
- Test: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
- Reference: `apps/web/src/components/ui/select.tsx`
- Reference: `apps/web/src/components/ui/switch.tsx`

- [ ] **Step 1: Write the failing modal UI tests**

Add tests that assert:
- background swatches render
- font dropdown renders user-facing labels
- position dropdown renders top/center/bottom labels
- address switch renders

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: FAIL because the new controls are not rendered yet

- [ ] **Step 2: Extend `VideoPreviewTextEditor` props**

Add props for:
- `overlayDraft`
- `backgroundOptions`
- `fontOptions`
- `positionOptions`
- `onOverlayBackgroundChange`
- `onOverlayFontChange`
- `onOverlayPositionChange`
- `onOverlayAddressToggle`

- [ ] **Step 3: Render the overlay controls**

Implement:
- background swatch row with circular buttons
- font dropdown showing friendly labels and styled font presentation
- position dropdown
- address switch

Keep the existing header/caption/actions behavior unchanged.

- [ ] **Step 4: Run the modal test file**

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS for the newly added rendering assertions, with other failures still expected until modal wiring is added

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx
git commit -m "feat: add overlay style controls to reel editor"
```

### Task 3: Wire Modal Draft State and Live Preview Updates

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
- Reference: `apps/web/src/components/listings/create/media/video/components/videoPreviewOverlayControls.ts`

- [ ] **Step 1: Add failing modal behavior tests**

Add tests that verify:
- changing each overlay control sets dirty state
- Cancel resets overlay draft values
- discard-confirm resets overlay draft values
- player input receives updated overlay values after control changes

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: FAIL because modal state does not yet include overlay draft logic

- [ ] **Step 2: Seed overlay draft on modal open**

In `VideoPreviewModal.tsx`:
- seed `overlayDraft` from `selectedPreview`
- reset it in the same places hook/caption/segments are reset

- [ ] **Step 3: Apply overlay draft to preview segments**

Update the draft segment pipeline so that:
- segment overlays reflect current `hookDraft` plus `overlayDraft`
- address toggle adds/removes supplemental address overlays
- timeline edits preserve current overlay draft styling

- [ ] **Step 4: Include overlay draft in `isDirty`**

Dirty state should compare current overlay draft against the seeded/saved overlay draft values.

- [ ] **Step 5: Thread overlay control props into `VideoPreviewTextEditor`**

Use the helper option metadata and local change handlers.

- [ ] **Step 6: Run the modal test file**

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS for new dirty/reset/live-preview tests

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx
git commit -m "feat: wire reel preview overlay draft state"
```

### Task 4: Extend Save Payload and Domain Types

**Files:**
- Modify: `apps/web/src/lib/domain/listings/content/create.ts`
- Modify: `apps/web/src/lib/domain/listings/content/index.ts`
- Modify: `apps/web/src/components/listings/create/shared/types.ts` (only if re-export adjustments are needed)
- Modify: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`

- [ ] **Step 1: Add the failing save-payload test**

Extend the existing modal save expectation to include the overlay settings fields in `mockOnSave`.

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: FAIL because save payload typing and implementation do not include overlay settings yet

- [ ] **Step 2: Extend `PlayablePreviewTextUpdate` and related persisted content typing**

Add explicit fields for:
- `overlayBackground`
- `overlayPosition`
- `overlayFontPairing`
- `showAddress`

- [ ] **Step 3: Include overlay draft values in modal save**

Update `handleSave()` in `VideoPreviewModal.tsx` to pass the new fields.

- [ ] **Step 4: Run the modal test file**

Run: `npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/domain/listings/content/create.ts apps/web/src/lib/domain/listings/content/index.ts apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx
git commit -m "feat: include reel overlay settings in save payload"
```

### Task 5: Validate and Persist Overlay Settings in Reel Save Actions

**Files:**
- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
- Modify: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`
- Modify: `apps/web/src/server/infra/cache/listingContent/types.ts`
- Modify: `apps/web/src/server/infra/cache/listingContent/cache.ts`
- Modify: `apps/web/src/server/infra/cache/listingContent/__tests__/cache.test.ts`

- [ ] **Step 1: Write failing server-side tests**

Add tests that verify:
- reel save actions accept and normalize explicit overlay fields
- cache write/read paths persist overlay settings

Run: `npm test --workspace=@zencourt/web -- actions.test.ts cache.test.ts`
Expected: FAIL because overlay settings are not yet validated or persisted

- [ ] **Step 2: Extend the reel save action normalization**

In `reels/actions.ts`:
- validate allowed background, position, and font values
- normalize `showAddress` to boolean
- pass the fields through save inputs

- [ ] **Step 3: Extend cache-layer types and persistence**

In cache type/contracts and write/read mappers:
- add the overlay settings fields
- preserve null/undefined semantics consistently with existing metadata

- [ ] **Step 4: Run targeted server/cache tests**

Run: `npm test --workspace=@zencourt/web -- actions.test cache.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/server/actions/listings/content/reels/actions.ts apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts apps/web/src/server/infra/cache/listingContent/types.ts apps/web/src/server/infra/cache/listingContent/cache.ts apps/web/src/server/infra/cache/listingContent/__tests__/cache.test.ts
git commit -m "feat: persist reel overlay settings"
```

### Task 6: Rebuild Previews Using Saved Overlay Overrides

**Files:**
- Modify: `apps/web/src/lib/domain/listings/content/createPreviewPlans.ts`
- Modify: `apps/web/src/components/listings/create/media/video/videoPreviewViewModel.ts`
- Modify: `apps/web/src/components/listings/create/media/video/__tests__/videoPreviewViewModel.test.ts`
- Modify: `apps/web/src/lib/domain/listings/content/__tests__/createPreviewPlans.test.ts` (if plan-layer assertions belong there)

- [ ] **Step 1: Add the failing preview-rebuild tests**

Add tests that verify:
- existing seeded randomness remains the default when no explicit overlay settings exist
- saved overlay settings override seeded background/position/font/address when present

Run: `npm test --workspace=@zencourt/web -- videoPreviewViewModel.test.ts createPreviewPlans.test.ts`
Expected: FAIL because rebuild logic does not yet prefer saved overlay settings

- [ ] **Step 2: Add override application to preview rebuilding**

Update preview/domain rebuilding so that:
- saved overlay values are read from persisted metadata
- explicit saved values override the seeded overlay variant
- address visibility obeys saved `showAddress`

- [ ] **Step 3: Run targeted preview rebuild tests**

Run: `npm test --workspace=@zencourt/web -- videoPreviewViewModel.test.ts createPreviewPlans.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/domain/listings/content/createPreviewPlans.ts apps/web/src/components/listings/create/media/video/videoPreviewViewModel.ts apps/web/src/components/listings/create/media/video/__tests__/videoPreviewViewModel.test.ts apps/web/src/lib/domain/listings/content/__tests__/createPreviewPlans.test.ts
git commit -m "feat: apply saved reel overlay overrides to previews"
```

### Task 7: Final Verification

**Files:**
- Modify: none unless failures require fixes

- [ ] **Step 1: Run focused test suites**

Run:

```bash
npm test --workspace=@zencourt/web -- videoPreviewOverlayControls.test.ts
npm test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx
npm test --workspace=@zencourt/web -- videoPreviewViewModel.test.ts
npm test --workspace=@zencourt/web -- createPreviewPlans.test.ts
npm test --workspace=@zencourt/web -- actions.test.ts
npm test --workspace=@zencourt/web -- cache.test.ts
```

Expected: PASS

- [ ] **Step 2: Run web workspace type-check**

Run:

```bash
npm run type-check --workspace=@zencourt/web
```

Expected: exit 0

- [ ] **Step 3: Review diff for accidental scope creep**

Check:
- no unrelated layout regressions
- no duplicate overlay option sources
- no persistence-only fields left unused in the modal

- [ ] **Step 4: Commit final fixes if needed**

```bash
git add .
git commit -m "test: verify reel overlay controls implementation"
```

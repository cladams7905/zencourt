# Reel Preview Overlay Controls Design

## Goal

Add overlay-style controls to the reel preview modal right column so users can edit the same style dimensions that are currently seeded randomly for video text overlays:

- background color
- text position
- font style
- address visibility

These edits should behave like the existing header, caption, and timeline edits:

- they are local draft changes while the modal is open
- they update the live reel preview immediately
- they only persist when the user clicks Save

## Current State

The reel preview modal currently allows editing:

- header text
- caption text
- timeline order and durations

The overlay appearance itself is generated earlier in the preview-building flow in `videoPreviewViewModel.ts`. The modal then previews the already-generated overlays but does not expose controls for them.

The current overlay generation path randomly seeds:

- background
- position
- font pairing
- supplemental address overlay presence and placement

## Proposed UX

Extend the right column editor in the reel preview modal with an `Overlay Style` section below Header and Caption.

### Controls

#### Background

Render a horizontal row of circular swatches.

- each swatch maps to a supported overlay background value
- the selected swatch gets an explicit selected ring/border state
- swatches should use the actual rendered color tokens, not text labels only

#### Font

Render a dropdown with user-facing labels and real font styling in each option.

Examples:

- Elegant Serif
- Editorial Clean
- Modern Script

Internally, each option maps to the existing `fontPairing` ids already used by the text overlay system.

#### Position

Render a dropdown with:

- Top
- Center
- Bottom

Internally these map to:

- `top-third`
- `center`
- `bottom-third`

#### Address

Render a switch labeled `Show address`.

- on: supplemental address overlay appears
- off: supplemental address overlay is removed

## Interaction Model

These controls are part of the modal draft state.

### Draft lifecycle

On modal open:

- read the current preview’s shared overlay values
- seed a local `overlayDraft`

While editing:

- update the live player preview immediately
- include the overlay draft in dirty-state calculation

On Cancel:

- reset overlay draft to the last saved preview values

On discard from close-confirm:

- reset overlay draft with the rest of the modal draft state

On Save:

- persist the overlay draft alongside the existing reel edit payload

## State Model

Add a modal-local overlay draft object in `VideoPreviewModal.tsx`.

Suggested shape:

```ts
type ReelOverlayDraft = {
  background: PreviewTextOverlay["background"];
  position: PreviewTextOverlay["position"];
  fontPairing: NonNullable<PreviewTextOverlay["fontPairing"]>;
  showAddress: boolean;
};
```

This state should be seeded from the currently selected preview and treated as part of the existing modal draft model.

## Source of Truth

### Before save

The modal-local draft is the source of truth.

### After save

Persisted overlay settings become the source of truth for subsequent opens.

### Fallback behavior

If no explicit saved overlay settings exist yet, the existing random seeding logic remains the default.

This preserves current behavior for untouched previews while allowing user overrides to become durable once saved.

## Overlay Application Strategy

Do not edit each segment independently from the UI. Treat the modal as a shared reel-style editor.

Behavior:

- read the initial style from the first segment with `textOverlay`
- infer `showAddress` from presence of `supplementalAddressOverlay`
- when a user changes a control, regenerate the visible overlay styling across the draft segments

The live modal preview should apply one shared overlay configuration across the reel.

## Helper Boundary

Add a focused helper module for the overlay control mapping instead of expanding the modal component with more style logic.

Suggested responsibilities:

- `seedOverlayDraftFromPreview(preview)`
- `applyOverlayDraftToSegments({ segments, hookText, overlayDraft, previewContext })`
- option metadata for:
  - background swatches
  - font dropdown labels
  - position dropdown labels

This keeps the modal component focused on orchestration and view state.

## Reuse of Existing Overlay Logic

The implementation should reuse the current text overlay generation rules where possible rather than creating a second visual system.

In particular:

- preserve existing line/template building behavior
- preserve current font pairing ids
- preserve existing supplemental address placement rules

The modal helper should apply user overrides on top of the current preview model, not replace the preview-generation pipeline wholesale.

## Persistence Changes

The existing save contract needs to grow to carry explicit overlay settings.

Persisted fields should cover:

- overlay background
- overlay position
- overlay font pairing
- address visibility

The preview-building layer should then prefer saved explicit values when present and fall back to seeded randomness when absent.

## UI Component Changes

### `VideoPreviewTextEditor.tsx`

Expand the editor layout to include:

- header field
- caption field
- overlay style section
- desktop action row

Potential refactor:

- keep action buttons separate
- introduce a small presentational overlay-controls subcomponent if the editor file starts growing too much

### `VideoPreviewModal.tsx`

Add:

- local overlay draft state
- overlay draft seeding/reset logic
- dirty-state integration
- preview segment regeneration wiring
- save payload extension

### View-model / preview persistence layer

Add support for:

- explicit saved overlay settings
- applying saved settings when rebuilding previews after save/reopen

## Option Metadata

The UI should use user-facing labels for fonts rather than raw internal ids.

Example mapping:

- `editorial-script` -> `Elegant Serif`
- `editorial-clean` -> `Editorial Clean`
- `contemporary-script` -> `Modern Script`
- `statement-script` -> `Statement Script`

Exact naming can be refined during implementation, but the underlying model should continue using the existing internal ids.

## Testing Plan

### Modal tests

Update `VideoPreviewModal.test.tsx` to verify:

- overlay controls render
- changing each control updates dirty state
- cancel resets overlay changes
- discard-confirm resets overlay changes
- save includes overlay settings
- live preview player receives updated overlay data

### Helper tests

Add focused unit tests for:

- seeding overlay draft from preview
- applying overlay draft to segment overlays
- address toggle add/remove behavior
- user-facing option mapping to internal values

### View-model / persistence tests

Add or update tests to verify:

- explicit saved overlay settings override random seeded defaults
- reopening after save reflects the saved overlay settings

## Risks

### Hidden coupling to seeded overlay generation

The modal preview currently consumes already-built overlays. If save persistence is introduced carelessly, the system could drift between:

- seeded preview generation
- modal draft preview generation
- saved preview regeneration

Mitigation:

- centralize override application in one helper boundary
- keep saved override fields explicit and small

### UI scope creep in the editor column

Adding multiple controls to the text editor risks making the right column harder to scan.

Mitigation:

- keep the section grouped and visually separated
- use compact controls
- prefer a single overlay section rather than distributing controls across the panel

## Recommended Implementation Direction

1. Add modal-local overlay draft state and option metadata.
2. Add helper functions to seed and apply draft overlay settings.
3. Add UI controls to the right column editor.
4. Extend save payload and persistence model for explicit overlay settings.
5. Update preview rebuilding to prefer saved settings over random seeds.
6. Add modal, helper, and persistence tests.

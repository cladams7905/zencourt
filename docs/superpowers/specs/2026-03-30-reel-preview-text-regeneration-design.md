# Reel Preview Text Regeneration Design

## Goal

Add per-field regenerate controls to the reel preview modal so users can regenerate the `Header` or `Caption` independently while editing a reel draft.

The flow must:

- add a small sparkles icon button to the top-right of each `Header` and `Caption` label row
- open a popover with `Random regenerate` and `Custom prompt`
- allow custom prompt entry in a second popover state
- update only the modal draft state, never persist immediately
- keep `Save` as the only persistence boundary

## Current Context

The reel preview modal in [`apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`](/Users/clada/dev/projects/zencourt/apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx) already owns the editable reel draft state for:

- hook
- caption
- overlay settings
- sequence ordering
- segment durations

The text inputs are rendered in [`apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx`](/Users/clada/dev/projects/zencourt/apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx).

The listing clip manager already has the popover interaction pattern we want in [`apps/web/src/components/listings/create/components/ListingClipManagerWorkspaceParts.tsx`](/Users/clada/dev/projects/zencourt/apps/web/src/components/listings/create/components/ListingClipManagerWorkspaceParts.tsx):

- first state with two regenerate options
- second state with a textarea for custom directions
- local loading and disabled behavior

The existing listing content generation path already calls the prompt assembly engine and supports prompt `notes` in [`apps/web/src/server/actions/listings/content/generate/upstream.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/actions/listings/content/generate/upstream.ts).

The reel save path already validates and persists edited reel draft text in [`apps/web/src/server/actions/listings/content/reels/actions.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/actions/listings/content/reels/actions.ts).

## Requirements

### Field Mapping

The UI label `Header` maps to the reel data field `hook`.

The UI label `Caption` maps to the reel data field `caption`.

Code, server actions, and tests should use `hook` and `caption` as the canonical field identifiers. UI copy should continue to display `Header` and `Caption`.

### UI

Add one regenerate control for `Header` and one for `Caption`.

Each control must:

- be rendered as a small sparkles icon button
- use a tooltip with text `Regenerate header` or `Regenerate caption`
- open a popover aligned with the clicked field
- follow the clip manager visual pattern for quick regenerate vs customize prompt

### Field Independence

The two regenerate controls are independent.

- `Header` regenerate only replaces the current hook draft
- `Caption` regenerate only replaces the current caption draft
- regenerating one field must not rewrite the other field

### Draft-Only Behavior

Regeneration must only update local modal draft state.

- no cached item update
- no saved content update
- no silent background persistence

After regeneration, the modal should behave exactly like any other unsaved edit:

- the editor becomes dirty
- the user may continue editing manually
- the user must click `Save` to persist changes

### Regenerate Modes

Each field supports two modes:

1. `Random regenerate`
2. `Custom prompt`

`Random regenerate` should immediately trigger regeneration for the clicked field.

`Custom prompt` should open a second popover state with a textarea for custom directions and a submit action.

If the user submits custom regenerate with empty directions, it should fall back to the same behavior as random regenerate.

### Prompt Behavior

`Random regenerate` should call the existing prompt assembly engine again.

`Custom prompt` must not reuse the full baked-in prompt strategy. It should preserve only:

- the minimum compliance and safety guidance required for this feature
- a strict structured output contract for the requested field
- the necessary factual reel and listing context so the output remains grounded

Other than those guardrails, the custom regenerate path should defer to the user’s directions.

### Loading and Error Handling

Loading state should be per field.

- if `Header` regenerate is in flight, only the header regenerate UI should be blocked
- if `Caption` regenerate is in flight, only the caption regenerate UI should be blocked
- other modal controls should remain usable unless they already depend on broader modal save state

The targeted text field should also be temporarily disabled while its regenerate request is in flight.

- while header regenerate is running, disable the header input
- while caption regenerate is running, disable the caption textarea

This prevents late regeneration responses from overwriting manual edits made after the request started.

Failures should not overwrite the current draft. They should surface through the existing modal toast or error patterns.

## Recommended Approach

Add a dedicated reel text regeneration action with two prompt modes behind one field-specific UI.

This keeps the design coherent:

- the modal remains the owner of unsaved draft state
- reel-specific regeneration logic stays with reel server actions instead of generic save mutations
- random regenerate can reuse the existing prompt assembly path
- custom regenerate can use a reduced prompt path without contaminating the normal content-generation flow

## Architecture

### 1. Reusable Field-Level Regenerate Control

Create a small reusable UI control for field regeneration in the reel text editor.

Responsibilities:

- render the sparkles icon button
- show the correct tooltip
- manage the two-step popover state
- capture custom directions
- call the parent callback for `random` or `custom`
- show local loading state

The component should be generic enough to support both `hook` and `caption` without duplicating the popover implementation.

Recommended props:

- `field: "hook" | "caption"`
- `isSubmitting: boolean`
- `onRandomRegenerate: () => void`
- `onCustomRegenerate: (directions: string) => void`

### 2. Modal Draft Integration

`VideoPreviewModal` should own the regeneration request state and draft updates.

Add a helper that builds the current draft context needed for regeneration from the same modal state already used for save:

- current hook
- current caption
- ordered clip ids
- clip durations or normalized sequence
- reel save target metadata
- listing id

When a regeneration response arrives:

- update only `hookDraft` for a header request
- update only `captionDraft` for a caption request
- leave the other field untouched

The result should flow through the existing dirty-state logic naturally by mutating modal draft state.

### 3. Dedicated Reel Regeneration Server Action

Add a reel-specific server action under the reel action area.

Recommended responsibility:

- validate listing access
- validate the requested field and mode
- normalize the current reel context
- dispatch to the appropriate prompt-generation path
- return one string for the requested field

Recommended input shape:

```ts
type RegenerateListingVideoReelTextParams = {
  targetField: "hook" | "caption";
  mode: "random" | "custom";
  customDirections?: string;
  currentHook: string;
  currentCaption: string;
  orderedClipIds: string[];
  sequence: ReelSequenceItem[];
  saveTarget: PlayablePreviewSaveTarget;
};
```

Recommended output shape:

```ts
type RegenerateListingVideoReelTextResult = {
  targetField: "hook" | "caption";
  value: string;
};
```

This should not persist the returned text.

### 4. Random Regenerate Path

For `mode: "random"`, reuse the existing prompt assembly engine without calling the full listing generation action that writes generated items into cache.

The implementation should:

- resolve the reel’s listing and subcategory context
- provide the current reel context as generation input
- call the shared prompt-building and generation helpers behind the normal prompt assembly behavior
- parse the generated result
- return only the requested field

This path is intentionally allowed to keep the normal baked-in listing generation behavior.

This path must not:

- call the listing content stream action end-to-end
- write generated reel text into cached listing content
- persist any saved content mutations

### 5. Custom Regenerate Path

For `mode: "custom"`, use a reduced prompt builder dedicated to reel text regeneration.

This prompt must include only:

- required compliance and safety constraints
- a strict output schema for the requested field
- factual reel and listing context needed for grounding
- the user’s custom directions

This prompt must not include the normal opinionated style/tone/marketing steering from the standard prompt engine.

The custom regenerate contract should behave like:

- user instructions drive the content
- system instructions constrain compliance and output format
- listing and reel facts provide grounding

Recommended model output schema for the internal AI call:

```ts
type ReelFieldRegenerationOutput = {
  value: string;
};
```

The action should require a non-empty `value` from the model and map it into the canonical action response shape:

```ts
type RegenerateListingVideoReelTextResult = {
  targetField: "hook" | "caption";
  value: string;
};
```

### 6. Grounding Context

Both regenerate modes need enough factual context to avoid generic or hallucinated copy.

Minimum recommended context:

- listing location or identifying market context already used in prompt assembly
- listing subcategory
- reel sequence or ordered clip information
- current paired text value for the non-target field

Including the non-target field as context is useful for coherence, but the response must still only replace the targeted field.

### 7. Persistence Boundary

The existing save flow remains unchanged.

Regeneration should not:

- call `saveListingVideoReel`
- call `updateCachedListingVideoText`
- update saved or cached content records

Only the existing modal `Save` action should persist regenerated text.

## Data Flow

### Random Header Regenerate

1. User clicks the header sparkles button.
2. Popover opens.
3. User clicks `Random regenerate`.
4. Modal sends the current reel draft context with `targetField="hook"` and `mode="random"`.
5. Server action calls the existing prompt assembly path.
6. Server action returns a new hook value.
7. Modal updates `hookDraft` only.
8. Modal becomes dirty until the user clicks `Save`.

### Custom Caption Regenerate

1. User clicks the caption sparkles button.
2. Popover opens.
3. User clicks `Custom prompt`.
4. Secondary popover state shows a textarea.
5. User submits custom directions.
6. Modal sends the current reel draft context with `targetField="caption"`, `mode="custom"`, and the custom directions.
7. If the custom directions are empty after trimming, the server action treats the request as `mode="random"`.
8. Otherwise, the server action calls the reduced custom prompt path.
9. Server action returns a new caption value.
10. Modal updates `captionDraft` only.
11. Modal becomes dirty until the user clicks `Save`.

## Testing Strategy

Add focused tests around the UI behavior and the reel action contract.

### UI Tests

Update reel modal tests to cover:

- header and caption regenerate icon buttons render with correct tooltips
- clicking each button opens the regenerate options popover
- clicking `Custom prompt` expands the custom directions state
- random regenerate calls the correct callback for the clicked field
- custom regenerate submits the correct field and directions
- only the targeted draft field changes after a successful response
- per-field loading state disables only the active field’s regenerate UI

### Server Action Tests

Add tests for:

- invalid or missing target field
- random mode uses the existing prompt-assembly path
- custom mode uses the reduced prompt path
- empty custom directions fall back to the random prompt path
- custom mode does not include the standard baked-in style logic
- empty or malformed model output is rejected
- the action returns only the requested field
- no persistence actions are invoked during regeneration

## Risks And Guardrails

### Over-Reusing The Standard Prompt Engine

Risk:
Custom regenerate could accidentally inherit the same prompt behavior as random regenerate.

Guardrail:
Implement separate code paths for `random` and `custom` inside the reel regeneration action and test that the custom path uses reduced prompt construction.

### Blurring Draft And Persistence State

Risk:
A regeneration callback could update cached or saved content directly.

Guardrail:
Keep the action return type draft-only and do not call save/update content actions from regeneration code.

### Rewriting The Wrong Field

Risk:
The server could generate both fields and the client could overwrite more than intended.

Guardrail:
Return a single targeted value and apply it only to the matching modal draft setter.

## Out Of Scope

This feature does not:

- add automatic save after regenerate
- regenerate both header and caption in one click
- add regenerate controls outside the reel preview modal
- redesign the broader reel text editor layout
- change the existing save validation rules

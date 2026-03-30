# Reel Preview Text Regeneration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add independent header and caption regenerate controls in the reel preview modal, with random and custom prompt flows that update only local draft state until save.

**Architecture:** Keep the modal as the owner of draft text state, add a reusable field-level regenerate popover control inside the text editor, and introduce a reel-specific server action that returns one regenerated field without writing cached or saved content. Random regenerate will reuse shared prompt-building/generation helpers without the cache-writing listing generation action, while custom regenerate will use a reduced compliance-and-schema-only prompt path.

**Tech Stack:** Next.js, React, Jest, server actions, existing AI prompt assembly helpers

---

### Task 1: Plan Server Action Contract

**Files:**
- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
- Modify: `apps/web/src/server/actions/listings/content/reels/index.ts`
- Test: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`

- [ ] **Step 1: Write a failing server action test for random hook regeneration**

Add test coverage for:
- invalid or missing `targetField`
- invalid `mode`
- a valid random hook regeneration call returning `{ targetField, value }` with no persistence helpers called

- [ ] **Step 2: Run the server action test to verify it fails**

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts -t "random reel text regeneration"`
Expected: FAIL because the action does not exist yet.

- [ ] **Step 3: Add the minimal exported server action contract**

Add the new server action and export wiring with request validation, access checks, and a placeholder response path.

- [ ] **Step 4: Run the test to verify the new failure is deeper**

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts -t "random reel text regeneration"`
Expected: FAIL on missing helper behavior rather than missing symbol.

### Task 2: Implement Random Regenerate Helper Path

**Files:**
- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
- Create or Modify: `apps/web/src/server/actions/listings/content/reels/regenerate.ts`
- Test: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`

- [ ] **Step 1: Write a failing test that random regenerate reuses prompt-generation helpers without cache writes**

Cover:
- random mode returns only the requested field
- cache-write helpers are not called
- save/update content helpers are not called

- [ ] **Step 2: Run the targeted test and confirm it fails for the intended reason**

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts -t "reuses prompt helpers without cache writes"`
Expected: FAIL because the helper path is not implemented.

- [ ] **Step 3: Implement the minimal random regenerate helper path**

Use shared prompt-building/generation helpers rather than the full listing content generation stream action, then parse and return only the requested field.

- [ ] **Step 4: Run the targeted test to verify it passes**

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts -t "reuses prompt helpers without cache writes"`
Expected: PASS.

### Task 3: Implement Custom Regenerate Reduced Prompt Path

**Files:**
- Modify: `apps/web/src/server/actions/listings/content/reels/actions.ts`
- Create or Modify: `apps/web/src/server/actions/listings/content/reels/regenerate.ts`
- Test: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`

- [ ] **Step 1: Write failing tests for custom regenerate**

Cover:
- custom mode uses reduced prompt construction
- empty custom directions fall back to random behavior
- malformed or empty output is rejected

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts -t "custom reel text regeneration"`
Expected: FAIL because the custom path is incomplete.

- [ ] **Step 3: Implement the minimal reduced prompt path**

Build a focused prompt with only critical compliance rules, schema enforcement, listing/reel grounding, and user directions, then map the model output into `{ targetField, value }`.

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts -t "custom reel text regeneration"`
Expected: PASS.

### Task 4: Add Reusable Reel Text Regenerate UI Control

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx`
- Create: `apps/web/src/components/listings/create/media/video/components/ReelTextRegenerateControl.tsx`
- Test: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`

- [ ] **Step 1: Write a failing modal test for the header and caption regenerate controls**

Cover:
- sparkles icon buttons render next to both labels
- correct tooltips appear
- clicking opens the options popover

- [ ] **Step 2: Run the targeted modal test to verify it fails**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx -t "renders header and caption regenerate controls"`
Expected: FAIL because the controls are not rendered.

- [ ] **Step 3: Implement the reusable control and wire it into the text editor**

Reuse the clip manager popover interaction pattern, keeping the control generic for `hook` and `caption`.

- [ ] **Step 4: Run the targeted modal test to verify it passes**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx -t "renders header and caption regenerate controls"`
Expected: PASS.

### Task 5: Wire Modal Draft State To The Regeneration Action

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx`
- Test: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`

- [ ] **Step 1: Write failing modal tests for field-specific draft updates**

Cover:
- random header regenerate updates only the header draft
- custom caption regenerate updates only the caption draft
- empty custom directions behave like random regenerate

- [ ] **Step 2: Run the targeted modal tests to verify they fail**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx -t "updates only the targeted draft field"`
Expected: FAIL because the modal does not call the new action yet.

- [ ] **Step 3: Implement the minimal modal action wiring**

Build the regeneration request payload from current draft state, call the new action, and update only the targeted draft setter.

- [ ] **Step 4: Run the targeted modal tests to verify they pass**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx -t "updates only the targeted draft field"`
Expected: PASS.

### Task 6: Add In-Flight Field Locking And Error Handling

**Files:**
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewModal.tsx`
- Modify: `apps/web/src/components/listings/create/media/video/components/VideoPreviewTextEditor.tsx`
- Test: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`

- [ ] **Step 1: Write failing modal tests for per-field loading and locking**

Cover:
- header input disables while header regenerate is in flight
- caption textarea disables while caption regenerate is in flight
- the non-target field remains usable
- failures leave the current draft unchanged

- [ ] **Step 2: Run the targeted tests to verify they fail**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx -t "disables only the targeted field during regeneration"`
Expected: FAIL because the in-flight locking behavior is not implemented.

- [ ] **Step 3: Implement minimal per-field loading and error handling**

Track in-flight state by field in the modal, disable the targeted input/control while awaiting the action, and surface failures without overwriting draft text.

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx -t "disables only the targeted field during regeneration"`
Expected: PASS.

### Task 7: Run Focused And Broader Verification

**Files:**
- Test: `apps/web/src/components/listings/create/media/video/components/__tests__/VideoPreviewModal.test.tsx`
- Test: `apps/web/src/server/actions/listings/content/reels/__tests__/actions.test.ts`

- [ ] **Step 1: Run the focused reel modal and reel action suites**

Run: `npm run test --workspace=@zencourt/web -- VideoPreviewModal.test.tsx`
Expected: PASS.

Run: `npm run test --workspace=@zencourt/web -- actions.test.ts`
Expected: PASS for the reel action coverage.

- [ ] **Step 2: Run a workspace type check if code paths changed shared types**

Run: `npm run type-check --workspace=@zencourt/web`
Expected: PASS.

- [ ] **Step 3: Review changed files for scope and clarity**

Inspect the diff to confirm the feature stayed limited to reel preview text regeneration and did not introduce persistence behavior.

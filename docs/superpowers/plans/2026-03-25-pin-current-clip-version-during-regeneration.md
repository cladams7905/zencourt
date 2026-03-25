# Pin Current Clip Version During Regeneration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the clip manager showing the last successful clip version while a regeneration is pending or processing, instead of swapping in an empty thumbnail/duration immediately.

**Architecture:** Compute a display-stable `currentVersion` in the listing query layer by falling back to the latest successful version when the persisted current clip version is non-terminal and lacks final assets. Expose the pending/processing version separately so the UI can still show regeneration state, cancel controls, and transition to the new version once it succeeds.

**Tech Stack:** TypeScript, Jest, Next.js server actions, React client component, SWR

---

### Task 1: Add failing query test for pinned current version

**Files:**
- Modify: `apps/web/src/server/actions/listings/__tests__/queries.test.ts`
- Modify: `apps/web/src/server/actions/listings/queries.ts`
- Modify: `apps/web/src/components/listings/create/shared/types.ts`
- Test: `apps/web/src/server/actions/listings/__tests__/queries.test.ts`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test --workspace=@zencourt/web -- queries.test.ts`
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test --workspace=@zencourt/web -- queries.test.ts`

### Task 2: Add failing UI test for preserving old thumbnail/duration during regeneration

**Files:**
- Modify: `apps/web/src/components/listings/create/components/__tests__/ListingClipManager.test.tsx`
- Modify: `apps/web/src/components/listings/create/components/ListingClipManager.tsx`
- Test: `apps/web/src/components/listings/create/components/__tests__/ListingClipManager.test.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test --workspace=@zencourt/web -- ListingClipManager.test.tsx`
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test --workspace=@zencourt/web -- ListingClipManager.test.tsx`

### Task 3: Verify the end-to-end behavior contract

**Files:**
- Modify: `apps/web/src/server/actions/listings/queries.ts`
- Modify: `apps/web/src/components/listings/create/components/ListingClipManager.tsx`
- Modify: `apps/web/src/components/listings/create/shared/types.ts`
- Test: `apps/web/src/server/actions/listings/__tests__/queries.test.ts`
- Test: `apps/web/src/components/listings/create/components/__tests__/ListingClipManager.test.tsx`

- [ ] **Step 1: Run the targeted web tests together**
  Run: `npm test --workspace=@zencourt/web -- queries.test.ts ListingClipManager.test.tsx`
- [ ] **Step 2: Run the web workspace type check**
  Run: `npm run type-check --workspace=@zencourt/web`

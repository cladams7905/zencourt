# Clip Manager Child Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the listing clip manager from a modal into a focused child route that preserves create-page query state and provides a quick back path to the create page.

**Architecture:** Keep the listing create page responsible for current tab/filter state and navigation into the child route. Refactor `ListingClipManager` into an inline workspace component that can be rendered directly on a new `/create/clips` page, while the create view keeps only the summary card link. The child page loads the same clip-version data on the server and uses the original query string only to build a back link.

**Tech Stack:** Next.js App Router, React client components, server actions, SWR, Jest, Testing Library

---

### Task 1: Route And Navigation Contract

**Files:**
- Modify: `apps/web/src/app/(dashboard)/listings/[listingId]/create/page.tsx`
- Create: `apps/web/src/app/(dashboard)/listings/[listingId]/create/clips/page.tsx`
- Test: `apps/web/src/app/(dashboard)/listings/[listingId]/create/__tests__/clipsPage.test.tsx`

- [ ] **Step 1: Write the failing route test**
- [ ] **Step 2: Run the focused test to verify it fails for the missing child route/back-link behavior**
- [ ] **Step 3: Add the new child route page and back-link query preservation**
- [ ] **Step 4: Re-run the focused route test to verify it passes**

### Task 2: Create View Navigation Refactor

**Files:**
- Modify: `apps/web/src/components/listings/create/components/ListingCreateView.tsx`
- Modify: `apps/web/src/components/listings/create/components/ListingClipManager.tsx`
- Test: `apps/web/src/components/listings/create/components/__tests__/ListingClipManager.test.tsx`

- [ ] **Step 1: Write failing component tests for inline workspace rendering and link-based entry from create**
- [ ] **Step 2: Run the focused component test to verify the current modal behavior fails those assertions**
- [ ] **Step 3: Refactor `ListingClipManager` into an inline workspace and make the create-page card navigate to the child route with preserved search params**
- [ ] **Step 4: Re-run the focused component test to verify it passes**

### Task 3: Verification

**Files:**
- Modify: `apps/web/src/components/listings/create/components/index.ts` (only if exports need adjustment)

- [ ] **Step 1: Run focused Jest coverage for the changed route/component files**
- [ ] **Step 2: Run `npm run type-check --workspace=@zencourt/web`**
- [ ] **Step 3: Fix any fallout and re-run verification until green**

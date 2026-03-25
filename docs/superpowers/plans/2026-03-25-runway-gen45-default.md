# Runway Gen4.5 Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow the video generation pipeline to dispatch either the existing Runway model or `gen4.5`, defaulting new Runway jobs to `gen4.5` when no model is set.

**Architecture:** Keep model selection job-scoped by reading `generationSettings.model` when present and defaulting inside the Runway dispatch path when absent. Centralize the supported Runway model list so dispatch, provider submission, cancellation, and recovery all use the same model classification without removing the legacy model path.

**Tech Stack:** TypeScript, Jest, Runway SDK, Drizzle model types

---

### Task 1: Add model coverage tests for dispatch defaulting

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test --workspace=@zencourt/video-server -- dispatchJob.test.ts`
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm test --workspace=@zencourt/video-server -- dispatchJob.test.ts`

### Task 2: Add Runway model selection and provider request coverage

**Files:**
- Modify: `apps/video-server/src/services/providers/runway/service.ts`
- Modify: `apps/video-server/src/services/providers/runway/types.ts`
- Modify: `apps/video-server/src/services/videoGeneration/strategies/runwayStrategy.ts`
- Modify: `apps/video-server/src/services/providers/runway/__tests__/service.test.ts`
- Modify: `apps/video-server/src/services/videoGeneration/strategies/__tests__/runwayStrategy.test.ts`
- Test: `apps/video-server/src/services/providers/runway/__tests__/service.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/strategies/__tests__/runwayStrategy.test.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run tests to verify they fail**
  Run: `npm test --workspace=@zencourt/video-server -- runwayStrategy.test.ts service.test.ts`
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run tests to verify they pass**
  Run: `npm test --workspace=@zencourt/video-server -- runwayStrategy.test.ts service.test.ts`

### Task 3: Keep Runway lifecycle helpers aligned with both models

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/cancelBatchGeneration.ts`
- Modify: `apps/video-server/src/services/videoGeneration/adapters/db.ts`
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/providerSuccess.ts`
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/cancelBatchGeneration.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/cancelBatchGeneration.test.ts`

- [ ] **Step 1: Write the failing tests**
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm test --workspace=@zencourt/video-server -- cancelBatchGeneration.test.ts`
- [ ] **Step 3: Write minimal implementation**
- [ ] **Step 4: Run the targeted test and related suite**
  Run: `npm test --workspace=@zencourt/video-server -- cancelBatchGeneration.test.ts dispatchJob.test.ts runwayStrategy.test.ts service.test.ts`

### Task 4: Update shared model types

**Files:**
- Modify: `packages/shared/types/models/videoGeneration.ts`
- Test: existing type-checked consumers in `apps/video-server/src/services/videoGeneration/*`

- [ ] **Step 1: Update the shared model union**
- [ ] **Step 2: Run targeted tests/type-safe consumers**
  Run: `npm test --workspace=@zencourt/video-server -- dispatchJob.test.ts runwayStrategy.test.ts service.test.ts cancelBatchGeneration.test.ts`

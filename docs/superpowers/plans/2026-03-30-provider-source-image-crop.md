# Provider Source Image Crop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure provider-submitted listing images are pre-cropped to the target output aspect ratio so generated clips do not start with black borders.

**Architecture:** Add a video-generation domain helper that downloads the selected listing image, detects whether it already matches the target aspect ratio, crops it with `sharp` when needed, uploads the derived asset into the job-scoped storage folder, and returns the derived URL. Wire that helper into job dispatch so provider strategies receive normalized source image URLs and persisted job runtime settings reflect the processed source.

**Tech Stack:** TypeScript, Jest, Sharp, existing storage service, existing video-generation dispatch orchestrator.

---

### Task 1: Crop Helper

**Files:**
- Create: `apps/video-server/src/services/videoGeneration/domain/providerSourceImage.ts`
- Test: `apps/video-server/src/services/videoGeneration/domain/__tests__/providerSourceImage.test.ts`

- [ ] **Step 1: Write failing tests for aspect-ratio detection, crop/upload, and fail-open fallback**
- [ ] **Step 2: Run the provider source image test file and confirm it fails**
- [ ] **Step 3: Implement the minimal `sharp`-backed crop helper**
- [ ] **Step 4: Re-run the provider source image test file and confirm it passes**

### Task 2: Dispatch Integration

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/dispatchJob.ts`
- Modify: `apps/video-server/src/services/videoGeneration/service.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts`

- [ ] **Step 1: Write failing dispatch test proving processed image URLs are used for provider dispatch and persisted job settings**
- [ ] **Step 2: Run the dispatch orchestrator test file and confirm the new assertion fails**
- [ ] **Step 3: Inject the crop helper into dispatch orchestration and build the job-scoped storage context from video context**
- [ ] **Step 4: Re-run the targeted dispatch and helper tests and confirm they pass**

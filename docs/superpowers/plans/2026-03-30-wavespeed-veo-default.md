# WaveSpeed Veo Default Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make WaveSpeed Google Veo 3.1 Fast the default provider for new video generation jobs, persist positive and negative prompts separately, add WaveSpeed webhook completion with recovery polling, and keep Runway as a fallback without leaving Runway-specific logic in shared orchestration.

**Architecture:** Keep the existing provider strategy/facade approach, add a first-class WaveSpeed provider module, and feed providers a neutral dispatch contract that includes both `prompt` and `negativePrompt`. Use WaveSpeed webhooks as the primary completion path, add a stale-job recovery poller for missed callbacks, and push provider-specific request shaping, verification, retrieval, and throttling into provider-owned modules instead of common service code.

**Tech Stack:** TypeScript, Express, Next.js, Jest, Drizzle model types, WaveSpeed SDK, Runway SDK

---

## File Structure

**Create:**
- `apps/video-server/src/services/providers/wavespeed/service.ts` - WaveSpeed SDK client, request submission, retrieval, optional cancellation
- `apps/video-server/src/services/providers/wavespeed/types.ts` - WaveSpeed provider input/output and normalized task types
- `apps/video-server/src/services/providers/wavespeed/index.ts` - provider exports
- `apps/video-server/src/services/providers/wavespeed/__tests__/service.test.ts` - WaveSpeed service request and response mapping coverage
- `apps/video-server/src/services/webhook/security/wavespeedWebhookVerification.ts` - HMAC verification for WaveSpeed webhook signatures
- `apps/video-server/src/services/webhook/security/__tests__/wavespeedWebhookVerification.test.ts` - verification unit tests
- `apps/video-server/src/services/videoGeneration/strategies/wavespeedStrategy.ts` - strategy for provider-neutral dispatch to WaveSpeed
- `apps/video-server/src/services/videoGeneration/strategies/__tests__/wavespeedStrategy.test.ts` - strategy behavior and throttle coverage

**Modify:**
- `packages/shared/types/models/videoGeneration.ts` - add `negativePrompt` to generation settings and any related consumer types
- `apps/web/src/server/services/videoGeneration/domain/prompt.ts` - split positive and negative prompt builders
- `apps/web/src/server/services/videoGeneration/domain/__tests__/prompt.test.ts` - prompt split coverage
- `apps/web/src/server/actions/video/generate/domain/jobs.ts` - persist `prompt` and `negativePrompt`
- `apps/web/src/server/actions/video/generate/helpers.ts` - persist split prompts for regeneration
- `apps/web/src/server/actions/video/generate/__tests__/helpers.test.ts` - generation/regeneration prompt field coverage
- `apps/web/src/server/actions/video/generate/domain/__tests__/jobs.test.ts` - job creation prompt field coverage
- `apps/web/src/server/actions/listings/clips/queries.ts` - stop stripping provider constraints from persisted prompts
- `apps/video-server/src/services/videoGeneration/facades/providerFacade.ts` - carry `negativePrompt` through provider dispatch input
- `apps/video-server/src/services/videoGeneration/orchestrators/dispatchJob.ts` - parse/store split prompts in dispatch flow
- `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts` - dispatch contract and provider ordering coverage
- `apps/video-server/src/services/videoGeneration/strategies/index.ts` - make WaveSpeed primary and keep Runway fallback
- `apps/video-server/src/services/providers/runway/service.ts` - accept combined prompt from provider-owned request shaping only
- `apps/video-server/src/services/videoGeneration/strategies/runwayStrategy.ts` - combine positive/negative prompts inside Runway provider path
- `apps/video-server/src/services/videoGeneration/domain/runwayTaskSlots.ts` or replacement utility - generalize or relocate provider task throttling
- `apps/video-server/src/services/videoGeneration/service.ts` - add WaveSpeed webhook/recovery handling and reduce direct Runway coupling
- `apps/video-server/src/services/videoGeneration/adapters/db.ts` - query stale jobs for WaveSpeed and move away from Runway-only recovery assumptions where practical
- `apps/video-server/src/services/videoGeneration/orchestrators/reconcileRunwayJob.ts` and/or provider-owned replacement - move Runway retrieval specifics toward provider-owned code
- `apps/video-server/src/routes/webhooks/domain/requests.ts` - add WaveSpeed webhook request parsing types
- `apps/video-server/src/routes/webhooks/orchestrators/handlers.ts` - add WaveSpeed verification/dispatch helpers without polluting Fal flow
- `apps/video-server/src/routes/webhooks/route.ts` - add `/wavespeed` webhook endpoint
- `apps/video-server/src/routes/webhooks/__tests__/route.test.ts` - route coverage for WaveSpeed webhook handling
- `apps/video-server/src/config/env.ts` - add WaveSpeed webhook secret and optional recovery/throttle env vars
- `apps/video-server/README.md` - document WaveSpeed provider, webhook config, and concurrency behavior

### Task 1: Split Prompt Storage In Shared Types And Web Builders

**Files:**
- Modify: `packages/shared/types/models/videoGeneration.ts`
- Modify: `apps/web/src/server/services/videoGeneration/domain/prompt.ts`
- Modify: `apps/web/src/server/services/videoGeneration/domain/__tests__/prompt.test.ts`
- Test: `apps/web/src/server/services/videoGeneration/domain/__tests__/prompt.test.ts`

- [ ] **Step 1: Write failing tests for split prompt construction**

Cover:
- positive prompt returns only the motion instruction
- negative prompt returns only compliance constraints
- no helper returns a single provider-shaped combined prompt for storage

- [ ] **Step 2: Run the targeted prompt tests and verify they fail**

Run: `npm run test --workspace=@zencourt/web -- prompt.test.ts`
Expected: FAIL because prompt helpers still produce the old combined prompt contract.

- [ ] **Step 3: Update shared types and prompt builders with the minimal split contract**

Add `negativePrompt` to `JobGenerationSettings`, replace the combined prompt helper with explicit positive and negative prompt builders, and keep any provider-specific concatenation out of the web prompt domain layer.

- [ ] **Step 4: Run the targeted prompt tests to verify they pass**

Run: `npm run test --workspace=@zencourt/web -- prompt.test.ts`
Expected: PASS.

### Task 2: Persist Split Prompts In Web Job Creation And Regeneration

**Files:**
- Modify: `apps/web/src/server/actions/video/generate/domain/jobs.ts`
- Modify: `apps/web/src/server/actions/video/generate/helpers.ts`
- Modify: `apps/web/src/server/actions/video/generate/domain/__tests__/jobs.test.ts`
- Modify: `apps/web/src/server/actions/video/generate/__tests__/helpers.test.ts`
- Modify: `apps/web/src/server/actions/listings/clips/queries.ts`
- Test: `apps/web/src/server/actions/video/generate/domain/__tests__/jobs.test.ts`
- Test: `apps/web/src/server/actions/video/generate/__tests__/helpers.test.ts`

- [ ] **Step 1: Write failing tests for persisted `prompt` and `negativePrompt` fields**

Cover:
- new generation jobs persist both fields
- regeneration persists both fields
- clip query mapping returns the stored positive prompt without trimming suffix text

- [ ] **Step 2: Run the targeted web generation tests and verify they fail**

Run: `npm run test --workspace=@zencourt/web -- jobs.test.ts helpers.test.ts`
Expected: FAIL because generation settings still use a single combined prompt field.

- [ ] **Step 3: Implement the minimal persistence updates**

Update job creation, regeneration, and clip query consumers so the stored prompt contract is provider-neutral and no longer depends on `stripProviderPromptConstraints`.

- [ ] **Step 4: Run the targeted tests to verify they pass**

Run: `npm run test --workspace=@zencourt/web -- jobs.test.ts helpers.test.ts`
Expected: PASS.

### Task 3: Extend Provider Dispatch Input For Split Prompts

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/facades/providerFacade.ts`
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/dispatchJob.ts`
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts`

- [ ] **Step 1: Write failing dispatch tests for provider-neutral prompt fields**

Cover:
- dispatch parses `prompt` and `negativePrompt` from generation settings
- `markJobProcessing` preserves both fields
- missing `negativePrompt` falls back safely for old rows if needed

- [ ] **Step 2: Run the targeted dispatch test and verify it fails**

Run: `npm run test --workspace=@zencourt/video-server -- dispatchJob.test.ts`
Expected: FAIL because dispatch input does not yet carry `negativePrompt`.

- [ ] **Step 3: Implement the minimal dispatch contract change**

Update the facade and dispatch orchestrator so providers receive both prompt fields without shifting provider-specific concatenation into shared code.

- [ ] **Step 4: Run the targeted dispatch test to verify it passes**

Run: `npm run test --workspace=@zencourt/video-server -- dispatchJob.test.ts`
Expected: PASS.

### Task 4: Add The WaveSpeed Provider Service

**Files:**
- Create: `apps/video-server/src/services/providers/wavespeed/service.ts`
- Create: `apps/video-server/src/services/providers/wavespeed/types.ts`
- Create: `apps/video-server/src/services/providers/wavespeed/index.ts`
- Create: `apps/video-server/src/services/providers/wavespeed/__tests__/service.test.ts`
- Modify: `apps/video-server/src/config/env.ts`
- Test: `apps/video-server/src/services/providers/wavespeed/__tests__/service.test.ts`

- [ ] **Step 1: Write failing WaveSpeed service tests**

Cover:
- SDK client reads `WAVESPEED_API_KEY`
- submit maps to `google/veo3.1-fast/image-to-video`
- request body uses `prompt`, `negative_prompt`, `image`, `duration`, `resolution`, `aspect_ratio`, and `generate_audio: false`
- retrieve maps provider responses into a normalized shape for reconciliation

- [ ] **Step 2: Run the targeted WaveSpeed service test and verify it fails**

Run: `npm run test --workspace=@zencourt/video-server -- service.test.ts -t "WaveSpeed"`
Expected: FAIL because the provider module does not exist yet.

- [ ] **Step 3: Implement the minimal WaveSpeed provider service and env support**

Add the provider module, client creation, request mapping, retrieval helper, and the required environment parsing for `WAVESPEED_API_KEY` and `WAVESPEED_WEBHOOK_SECRET`.

- [ ] **Step 4: Run the targeted WaveSpeed service test to verify it passes**

Run: `npm run test --workspace=@zencourt/video-server -- service.test.ts -t "WaveSpeed"`
Expected: PASS.

### Task 5: Add WaveSpeed Strategy And Make It Primary

**Files:**
- Create: `apps/video-server/src/services/videoGeneration/strategies/wavespeedStrategy.ts`
- Create: `apps/video-server/src/services/videoGeneration/strategies/__tests__/wavespeedStrategy.test.ts`
- Modify: `apps/video-server/src/services/videoGeneration/strategies/index.ts`
- Modify: `apps/video-server/src/services/videoGeneration/strategies/runwayStrategy.ts`
- Modify: `apps/video-server/src/services/videoGeneration/strategies/__tests__/runwayStrategy.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/strategies/__tests__/wavespeedStrategy.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/strategies/__tests__/runwayStrategy.test.ts`

- [ ] **Step 1: Write failing strategy tests for WaveSpeed-first ordering and Runway prompt fallback**

Cover:
- WaveSpeed is tried before Runway
- WaveSpeed uses the native negative prompt field
- Runway appends `negativePrompt` onto the positive prompt when used
- explicit fallback path still reaches Runway after a WaveSpeed dispatch failure

- [ ] **Step 2: Run the targeted strategy tests and verify they fail**

Run: `npm run test --workspace=@zencourt/video-server -- wavespeedStrategy.test.ts runwayStrategy.test.ts`
Expected: FAIL because WaveSpeed strategy and fallback behavior are not implemented.

- [ ] **Step 3: Implement the minimal strategy ordering and provider-owned prompt shaping**

Add `wavespeedStrategy`, update strategy ordering, and move the Runway prompt concatenation fully into the Runway strategy or provider service so shared dispatch code stays neutral.

- [ ] **Step 4: Run the targeted strategy tests to verify they pass**

Run: `npm run test --workspace=@zencourt/video-server -- wavespeedStrategy.test.ts runwayStrategy.test.ts`
Expected: PASS.

### Task 6: Generalize Provider Task Throttling And Set WaveSpeed To 100

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/domain/runwayTaskSlots.ts` or replace with a provider-neutral utility
- Modify: `apps/video-server/src/services/videoGeneration/domain/__tests__/runwayTaskSlots.test.ts` or replacement test
- Modify: `apps/video-server/src/services/videoGeneration/strategies/wavespeedStrategy.ts`
- Modify: `apps/video-server/src/services/videoGeneration/strategies/runwayStrategy.ts`
- Test: `apps/video-server/src/services/videoGeneration/domain/__tests__/runwayTaskSlots.test.ts` or replacement test

- [ ] **Step 1: Write failing tests for provider task throttling behavior**

Cover:
- WaveSpeed supports a 100-task limit
- slot ownership is no longer framed as shared Runway-only behavior
- releasing a provider task unblocks queued work deterministically

- [ ] **Step 2: Run the targeted throttling tests and verify they fail**

Run: `npm run test --workspace=@zencourt/video-server -- runwayTaskSlots.test.ts`
Expected: FAIL because the utility still reflects Runway-specific ownership or lacks the new WaveSpeed limit.

- [ ] **Step 3: Implement the minimal provider-neutral throttling update**

Either generalize the slot utility or move task throttles into provider-owned modules, then configure WaveSpeed with a default limit of 100 and keep Runway on its own setting.

- [ ] **Step 4: Run the targeted throttling tests to verify they pass**

Run: `npm run test --workspace=@zencourt/video-server -- runwayTaskSlots.test.ts`
Expected: PASS or replacement suite PASS.

### Task 7: Add WaveSpeed Webhook Verification

**Files:**
- Create: `apps/video-server/src/services/webhook/security/wavespeedWebhookVerification.ts`
- Create: `apps/video-server/src/services/webhook/security/__tests__/wavespeedWebhookVerification.test.ts`
- Modify: `apps/video-server/src/config/env.ts`
- Test: `apps/video-server/src/services/webhook/security/__tests__/wavespeedWebhookVerification.test.ts`

- [ ] **Step 1: Write failing verification tests**

Cover:
- valid signature passes
- missing headers fail
- stale timestamps fail
- invalid signature format fails
- `whsec_` prefix is removed before HMAC comparison

- [ ] **Step 2: Run the targeted verification test and verify it fails**

Run: `npm run test --workspace=@zencourt/video-server -- wavespeedWebhookVerification.test.ts`
Expected: FAIL because the verifier does not exist yet.

- [ ] **Step 3: Implement the minimal verifier**

Add raw-body signature verification exactly matching the documented WaveSpeed HMAC contract and expose it for route use.

- [ ] **Step 4: Run the targeted verification test to verify it passes**

Run: `npm run test --workspace=@zencourt/video-server -- wavespeedWebhookVerification.test.ts`
Expected: PASS.

### Task 8: Add WaveSpeed Webhook Route Handling

**Files:**
- Modify: `apps/video-server/src/routes/webhooks/domain/requests.ts`
- Modify: `apps/video-server/src/routes/webhooks/orchestrators/handlers.ts`
- Modify: `apps/video-server/src/routes/webhooks/route.ts`
- Modify: `apps/video-server/src/routes/webhooks/__tests__/route.test.ts`
- Modify: `apps/video-server/src/services/videoGeneration/service.ts`
- Test: `apps/video-server/src/routes/webhooks/__tests__/route.test.ts`

- [ ] **Step 1: Write failing route tests for `/webhooks/wavespeed`**

Cover:
- valid webhook returns `200`
- invalid signature is acknowledged but not processed
- async processing resolves the target job idempotently

- [ ] **Step 2: Run the targeted route test and verify it fails**

Run: `npm run test --workspace=@zencourt/video-server -- route.test.ts -t "wavespeed"`
Expected: FAIL because the route and handler do not exist yet.

- [ ] **Step 3: Implement the minimal WaveSpeed webhook route and service entry point**

Add a dedicated route, parsing helpers, verification wiring, and a `videoGenerationService` entry point for WaveSpeed completion updates while keeping Fal flow isolated.

- [ ] **Step 4: Run the targeted route test to verify it passes**

Run: `npm run test --workspace=@zencourt/video-server -- route.test.ts -t "wavespeed"`
Expected: PASS.

### Task 9: Add WaveSpeed Recovery Polling And Reduce Shared Runway Coupling

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/service.ts`
- Modify: `apps/video-server/src/services/videoGeneration/adapters/db.ts`
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/reconcileRunwayJob.ts` and/or provider-owned replacement
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/providerSuccess.test.ts`
- Add or Modify: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/reconcileWaveSpeedJob.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/reconcileWaveSpeedJob.test.ts`

- [ ] **Step 1: Write failing reconciliation tests**

Cover:
- stale WaveSpeed jobs are polled and completed from provider output
- stale WaveSpeed failures are marked failed and trigger failure webhooks
- already-terminal jobs are skipped
- shared service code delegates provider-specific retrieval details instead of embedding new Runway-style branching

- [ ] **Step 2: Run the targeted reconciliation tests and verify they fail**

Run: `npm run test --workspace=@zencourt/video-server -- reconcileWaveSpeedJob.test.ts`
Expected: FAIL because WaveSpeed recovery and the generalized provider-owned retrieval path do not exist.

- [ ] **Step 3: Implement the minimal recovery loop and Runway cleanup**

Add a WaveSpeed stale-job reconciliation path, update stale-job queries, and move any remaining request-status-specific Runway handling toward provider modules or provider-scoped helpers where practical in this change.

- [ ] **Step 4: Run the targeted reconciliation tests to verify they pass**

Run: `npm run test --workspace=@zencourt/video-server -- reconcileWaveSpeedJob.test.ts`
Expected: PASS.

### Task 10: Keep Cancellation And Fallback Behavior Intact

**Files:**
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/cancelBatchGeneration.ts`
- Modify: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/cancelBatchGeneration.test.ts`
- Modify: `apps/video-server/src/services/videoGeneration/adapters/db.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/cancelBatchGeneration.test.ts`

- [ ] **Step 1: Write failing cancellation tests for WaveSpeed-primary and Runway-fallback jobs**

Cover:
- WaveSpeed jobs are included in cancelable provider work where supported
- Runway fallback cancellation still works
- shared cancellation logic no longer relies only on Runway model classification for provider-managed jobs

- [ ] **Step 2: Run the targeted cancellation test and verify it fails**

Run: `npm run test --workspace=@zencourt/video-server -- cancelBatchGeneration.test.ts`
Expected: FAIL because provider-managed cancellation still assumes Runway-only classification.

- [ ] **Step 3: Implement the minimal cancellation alignment**

Update cancellation classification and delegation so WaveSpeed-primary jobs and Runway fallback jobs both preserve expected batch/job state transitions.

- [ ] **Step 4: Run the targeted cancellation test to verify it passes**

Run: `npm run test --workspace=@zencourt/video-server -- cancelBatchGeneration.test.ts`
Expected: PASS.

### Task 11: Update Documentation And Environment Contract

**Files:**
- Modify: `apps/video-server/README.md`
- Modify: `apps/video-server/src/config/env.ts`
- Test: existing env parsing coverage if present, otherwise type-safe import consumers

- [ ] **Step 1: Document the new WaveSpeed provider contract**

Add:
- required env vars
- webhook secret requirements
- concurrency notes
- webhook/recovery behavior

- [ ] **Step 2: Run any targeted env/config tests or relevant suites**

Run: `npm run test --workspace=@zencourt/video-server -- route.test.ts wavespeedWebhookVerification.test.ts service.test.ts`
Expected: PASS.

### Task 12: Run Focused Verification And Broader Safety Checks

**Files:**
- Test: `apps/web/src/server/services/videoGeneration/domain/__tests__/prompt.test.ts`
- Test: `apps/web/src/server/actions/video/generate/domain/__tests__/jobs.test.ts`
- Test: `apps/web/src/server/actions/video/generate/__tests__/helpers.test.ts`
- Test: `apps/video-server/src/services/providers/wavespeed/__tests__/service.test.ts`
- Test: `apps/video-server/src/services/webhook/security/__tests__/wavespeedWebhookVerification.test.ts`
- Test: `apps/video-server/src/routes/webhooks/__tests__/route.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/dispatchJob.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/strategies/__tests__/wavespeedStrategy.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/strategies/__tests__/runwayStrategy.test.ts`
- Test: `apps/video-server/src/services/videoGeneration/orchestrators/__tests__/cancelBatchGeneration.test.ts`

- [ ] **Step 1: Run the focused web and video-server test suites**

Run: `npm run test --workspace=@zencourt/web -- prompt.test.ts jobs.test.ts helpers.test.ts`
Expected: PASS.

Run: `npm run test --workspace=@zencourt/video-server -- dispatchJob.test.ts wavespeedStrategy.test.ts runwayStrategy.test.ts cancelBatchGeneration.test.ts route.test.ts wavespeedWebhookVerification.test.ts service.test.ts`
Expected: PASS.

- [ ] **Step 2: Run workspace type checks for both affected apps**

Run: `npm run type-check --workspace=@zencourt/web`
Expected: PASS.

Run: `npm run type-check --workspace=@zencourt/video-server`
Expected: PASS.

- [ ] **Step 3: Review the final diff for architecture boundaries**

Confirm that:
- prompt composition is provider-neutral in shared/web code
- WaveSpeed is primary and Runway remains fallback
- provider-specific request shaping, verification, retrieval, and throttling live in provider modules rather than common orchestration

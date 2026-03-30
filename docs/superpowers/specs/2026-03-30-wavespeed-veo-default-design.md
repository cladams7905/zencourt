# WaveSpeed Veo Default Design

## Goal

Make WaveSpeed's Google Veo 3.1 Fast integration the default video generation provider for new listing clip jobs while keeping Runway as a fallback provider.

The change must also:

- store positive and negative prompts separately in job generation settings
- send compliance guidance through WaveSpeed's native `negative_prompt` field
- raise WaveSpeed concurrency support to 100 active requests
- use WaveSpeed webhooks as the primary completion path
- keep a lightweight recovery poller for missed or delayed WaveSpeed webhooks
- reduce Runway-specific logic in shared orchestration so provider-specific behavior lives inside provider modules where possible

## Current Context

Web currently defaults video generation jobs to `veo3.1_fast` in [`apps/web/src/server/services/videoGeneration/config.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/services/videoGeneration/config.ts), but that model is still dispatched through the Runway provider strategy in [`apps/video-server/src/services/videoGeneration/strategies/runwayStrategy.ts`](/Users/clada/dev/projects/zencourt/apps/video-server/src/services/videoGeneration/strategies/runwayStrategy.ts).

Prompt assembly in [`apps/web/src/server/services/videoGeneration/domain/prompt.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/services/videoGeneration/domain/prompt.ts) currently appends compliance constraints directly onto the positive motion prompt. That makes the persisted prompt provider-shaped rather than provider-neutral.

Shared orchestration in [`apps/video-server/src/services/videoGeneration/service.ts`](/Users/clada/dev/projects/zencourt/apps/video-server/src/services/videoGeneration/service.ts) still knows about Runway-specific recovery and cancellation behavior. Recovery queries in [`apps/video-server/src/services/videoGeneration/adapters/db.ts`](/Users/clada/dev/projects/zencourt/apps/video-server/src/services/videoGeneration/adapters/db.ts) also classify work by Runway model names rather than by a more general provider-facing lifecycle contract.

Video-server already has inbound webhook routing in [`apps/video-server/src/routes/webhooks/route.ts`](/Users/clada/dev/projects/zencourt/apps/video-server/src/routes/webhooks/route.ts), but the route and request parsing are Fal-specific today. The web app already has an outbound completion webhook flow in [`apps/web/src/app/api/v1/webhooks/video/route.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/app/api/v1/webhooks/video/route.ts).

## Requirements

### Provider Ordering

- WaveSpeed must be the default primary provider for `veo3.1_fast`
- Runway must remain available as a fallback provider
- existing fallback behavior should remain inside the provider strategy/facade path rather than in route or render code

### Prompt Storage

Persist provider-neutral generation inputs:

- `prompt`: motion and creative instruction only
- `negativePrompt`: compliance constraints only

Web should stop storing a single provider-shaped combined prompt. Providers without native negative prompt support may combine the two fields when building the outbound request.

### WaveSpeed Request Shape

For `google/veo3.1-fast/image-to-video`, submit requests in the shape:

```json
{
  "image": "<public image url>",
  "prompt": "<positive prompt>",
  "duration": 4,
  "resolution": "4k",
  "aspect_ratio": "16:9",
  "generate_audio": false,
  "negative_prompt": "<negative prompt>"
}
```

Aspect ratio should remain derived from the job orientation so future vertical support is still possible.

### Webhooks

WaveSpeed webhooks should be the primary completion path. The handler must:

- accept the raw request body
- verify `webhook-id`, `webhook-timestamp`, and `webhook-signature`
- compute `HMAC_SHA256(secret_without_prefix, "{webhook-id}.{webhook-timestamp}.{raw_body}")`
- remove the `whsec_` prefix from the secret before hashing
- reject stale timestamps
- return `2xx` immediately after verification
- process completion/failure idempotently in the background

### Recovery

WaveSpeed should use a lightweight recovery poller for jobs that remain stuck in `processing` beyond a threshold.

Runway may keep recovery behavior, but shared orchestration should depend on provider-owned hooks or helpers where feasible rather than directly naming Runway-specific lifecycle code.

### Concurrency

WaveSpeed should support 100 active requests.

The architecture should keep provider-specific throttles separate from the coarse batch dispatch concurrency so a WaveSpeed limit increase does not imply that every provider shares the same operational ceiling.

## Recommended Approach

Add WaveSpeed as a first-class provider beside Runway and Kling, make it the first primary strategy, and keep provider-specific request shaping, webhook verification, retrieval, and throttling inside provider modules.

This keeps the existing provider abstraction intact while removing common-layer assumptions that `veo3.1_fast` implies Runway.

## Architecture

### 1. Provider-Neutral Generation Settings

Extend [`packages/shared/types/models/videoGeneration.ts`](/Users/clada/dev/projects/zencourt/packages/shared/types/models/videoGeneration.ts) so `JobGenerationSettings` stores both `prompt` and `negativePrompt`.

Web job creation and regeneration flows in:

- [`apps/web/src/server/actions/video/generate/domain/jobs.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/actions/video/generate/domain/jobs.ts)
- [`apps/web/src/server/actions/video/generate/helpers.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/actions/video/generate/helpers.ts)

should persist those separate values. Query consumers such as [`apps/web/src/server/actions/listings/clips/queries.ts`](/Users/clada/dev/projects/zencourt/apps/web/src/server/actions/listings/clips/queries.ts) should read the stored positive prompt directly instead of trimming a hardcoded suffix.

### 2. WaveSpeed Provider Module

Add a dedicated provider module under `apps/video-server/src/services/providers/wavespeed/` responsible for:

- client construction from `WAVESPEED_API_KEY`
- request mapping for `google/veo3.1-fast/image-to-video`
- webhook signature verification using `WAVESPEED_WEBHOOK_SECRET`
- task retrieval for recovery reconciliation
- task cancellation if the provider API supports it cleanly
- provider-specific concurrency throttling

Provider-specific semantics should stay there rather than leaking into shared orchestration.

### 3. Strategy Ordering And Dispatch Contract

Introduce a `wavespeedStrategy` that accepts provider-neutral dispatch input including:

- positive prompt
- negative prompt
- image URL
- duration
- orientation
- webhook URL
- model

Primary strategy ordering should become WaveSpeed first, then Runway, then Kling. Fallback strategy ordering should still allow Runway after a WaveSpeed failure.

For providers without native negative prompt support, the strategy or provider service should append `negativePrompt` onto the positive prompt during request construction.

### 4. WaveSpeed Webhook Flow

Add a WaveSpeed webhook route beside the existing Fal route. Route concerns should stay limited to:

- parsing raw body and headers
- delegating signature verification
- acknowledging immediately
- enqueueing async processing

Async processing should:

- resolve the job by provider task id or callback correlation id
- ignore duplicate terminal updates
- map `completed` payloads to shared success handling
- map `failed` payloads to shared failure handling

### 5. Recovery And Runway Cleanup

Introduce WaveSpeed-specific recovery reconciliation for stale `processing` jobs.

At the same time, reduce shared Runway coupling by moving provider-specific retrieval and recovery logic toward provider-owned helpers. Shared service code should orchestrate:

- selecting candidate stale jobs
- invoking provider retrieval/reconciliation helpers
- applying shared success/failure transitions

but should not need to know request payload details, task status enums, or slot semantics that belong to Runway itself.

### 6. Provider-Specific Concurrency Controls

Rename or replace the current Runway-specific slot abstraction in [`apps/video-server/src/services/videoGeneration/domain/runwayTaskSlots.ts`](/Users/clada/dev/projects/zencourt/apps/video-server/src/services/videoGeneration/domain/runwayTaskSlots.ts) so provider throttling is no longer framed as a shared Runway concept.

Two acceptable outcomes:

- generalize it into a provider-neutral task-slot utility used by WaveSpeed and Runway
- move equivalent slot/throttle ownership inside each provider module

Either way, WaveSpeed should be configured for 100 active tasks without forcing the same limit onto unrelated providers.

## Error Handling

- Invalid or unverifiable WaveSpeed webhooks should be acknowledged with `2xx` after logging to avoid provider retry storms, matching current webhook handling policy.
- Completed events without an output URL should be treated as provider failures.
- Recovery polling should only reconcile stale jobs and should no-op cleanly for already-terminal jobs.
- Provider cancellation should remain best-effort. Shared orchestration should mark batch/job cancellation consistently even if a provider-side cancel call is unsupported or races with completion.

## Testing

Add or update tests for:

- prompt and negativePrompt persistence in web job creation/regeneration
- prompt display/query behavior without suffix stripping
- WaveSpeed request payload mapping
- WaveSpeed webhook signature verification
- webhook idempotency for already-terminal jobs
- WaveSpeed recovery reconciliation
- primary strategy ordering and Runway fallback behavior
- provider-specific prompt combination for integrations without native negative prompts
- provider-specific concurrency configuration at 100 for WaveSpeed

## Open Questions Resolved

- WaveSpeed will be the default provider and Runway will remain fallback
- positive and negative prompts will be stored separately now
- WaveSpeed will use webhooks as the primary completion path with a lightweight recovery poller as a safety net

import logger from "@/config/logger";
import type { FalWebhookPayload } from "@shared/types/api";
import type { DBVideoGenJob } from "@shared/types/models";

type HandleFalWebhookDeps = {
  findJobByRequestId: (requestId: string) => Promise<DBVideoGenJob | null>;
  findJobById: (jobId: string) => Promise<DBVideoGenJob | null>;
  attachRequestIdToJob: (jobId: string, requestId: string) => Promise<void>;
  markJobFailed: (jobId: string, errorMessage: string) => Promise<void>;
  markVideoFailed: (videoId: string, errorMessage: string) => Promise<void>;
  handleProviderSuccess: (
    job: DBVideoGenJob,
    sourceUrl: string,
    metadata: {
      durationSeconds?: number;
      expectedFileSize?: number;
      thumbnailUrl?: string | null;
    }
  ) => Promise<void>;
  sendJobFailureWebhook: (
    job: DBVideoGenJob,
    errorMessage: string,
    errorType: string,
    errorRetryable: boolean
  ) => Promise<void>;
  getJobDurationSeconds: (job: DBVideoGenJob) => number;
};

function getValidRequestId(payload: FalWebhookPayload): string | null {
  if (!payload.request_id) {
    logger.error(
      { payload },
      "[VideoGenerationService] Fal webhook missing request_id"
    );
    return null;
  }
  return payload.request_id;
}

async function resolveJob(
  requestId: string,
  fallbackJobId: string | undefined,
  deps: HandleFalWebhookDeps
): Promise<DBVideoGenJob | null> {
  let job = await deps.findJobByRequestId(requestId);

  if (!job && fallbackJobId) {
    job = await deps.findJobById(fallbackJobId);
    if (job) {
      logger.warn(
        { requestId, fallbackJobId },
        "[VideoGenerationService] Webhook fallback lookup by jobId"
      );
      if (!job.requestId) {
        await deps.attachRequestIdToJob(job.id, requestId);
      }
    }
  }

  return job;
}

type IgnoreReason = "completed" | "canceled";

function getIgnoreReason(job: DBVideoGenJob): IgnoreReason | null {
  if (job.status === "completed") return "completed";
  if (job.status === "canceled") return "canceled";
  return null;
}

function logIgnoreReason(
  job: DBVideoGenJob,
  requestId: string,
  reason: IgnoreReason
): void {
  const message =
    reason === "completed"
      ? "[VideoGenerationService] Ignoring duplicate webhook for completed job"
      : "[VideoGenerationService] Ignoring webhook for canceled job";
  logger.info({ jobId: job.id, requestId }, message);
}

function isErrorResponse(payload: FalWebhookPayload): boolean {
  return payload.status === "ERROR" || !payload.payload?.video?.url;
}

async function handleFalErrorResponse(
  job: DBVideoGenJob,
  payload: FalWebhookPayload,
  requestId: string,
  deps: HandleFalWebhookDeps,
  startTime: number
): Promise<void> {
  const errorMessage =
    payload.error || "Provider reported an error during video generation";

  await deps.markJobFailed(job.id, errorMessage);
  await deps.markVideoFailed(
    job.videoGenBatchId,
    `Job ${job.id} failed: ${errorMessage}`
  );

  logger.error(
    {
      jobId: job.id,
      videoId: job.videoGenBatchId,
      requestId,
      error: errorMessage,
      duration: Date.now() - startTime
    },
    "[VideoGenerationService] Video job generation failed"
  );

  await deps.sendJobFailureWebhook(job, errorMessage, "PROVIDER_ERROR", false);
}

async function applyProviderSuccess(
  job: DBVideoGenJob,
  payload: FalWebhookPayload,
  deps: HandleFalWebhookDeps
): Promise<void> {
  const falVideoUrl = payload.payload!.video!.url;
  await deps.handleProviderSuccess(job, falVideoUrl, {
    durationSeconds:
      payload.payload!.video!.metadata?.duration ??
      deps.getJobDurationSeconds(job),
    expectedFileSize: payload.payload!.video!.file_size ?? undefined
  });
}

async function handleSuccessProcessingError(
  job: DBVideoGenJob,
  error: unknown,
  requestId: string,
  deps: HandleFalWebhookDeps,
  startTime: number
): Promise<void> {
  const errorMessage =
    error instanceof Error ? error.message : "Failed to process webhook";

  await deps.markJobFailed(job.id, errorMessage);

  logger.error(
    {
      jobId: job.id,
      videoId: job.videoGenBatchId,
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      duration: Date.now() - startTime
    },
    "[VideoGenerationService] Failed to process fal webhook"
  );
}

export async function handleFalWebhookOrchestrator(
  payload: FalWebhookPayload,
  fallbackJobId: string | undefined,
  deps: HandleFalWebhookDeps
): Promise<void> {
  const startTime = Date.now();

  const requestId = getValidRequestId(payload);
  if (requestId === null) return;

  logger.info(
    { requestId, status: payload.status, fallbackJobId },
    "[VideoGenerationService] Processing Fal webhook"
  );

  const job = await resolveJob(requestId, fallbackJobId, deps);
  if (!job) {
    logger.warn(
      { requestId },
      "[VideoGenerationService] Received webhook for unknown job"
    );
    return;
  }

  const ignoreReason = getIgnoreReason(job);
  if (ignoreReason !== null) {
    logIgnoreReason(job, requestId, ignoreReason);
    return;
  }

  if (isErrorResponse(payload)) {
    await handleFalErrorResponse(job, payload, requestId, deps, startTime);
    return;
  }

  try {
    await applyProviderSuccess(job, payload, deps);
  } catch (error) {
    await handleSuccessProcessingError(
      job,
      error,
      requestId,
      deps,
      startTime
    );
  }
}

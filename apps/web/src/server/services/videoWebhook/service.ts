import { revalidatePath } from "next/cache";
import {
  updateVideoGenJob,
  getVideoGenJobById
} from "@web/src/server/actions/db/videoGenJobs";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { DBVideoGenJob } from "@db/types/models";
import type { VideoStatus } from "@db/types/models";
import type {
  VideoWebhookPayload,
  NormalizedWebhookResult,
  ProcessVideoWebhookResult
} from "./types";

const logger = createChildLogger(baseLogger, {
  module: "video-webhook-service"
});

const TERMINAL_VIDEO_STATUSES: ReadonlySet<VideoStatus> = new Set([
  "completed",
  "failed",
  "canceled"
]);

export function normalizeWebhookResult(
  payload: VideoWebhookPayload
): NormalizedWebhookResult {
  const result = payload.result;
  const metadata = result?.metadata;

  return {
    videoUrl: result?.videoUrl ?? null,
    thumbnailUrl: result?.thumbnailUrl ?? null,
    errorMessage: payload.error?.message ?? null,
    metadata: metadata
      ? {
          ...metadata,
          duration: result?.duration ?? undefined,
          fileSize: result?.fileSize ?? undefined
        }
      : undefined
  };
}

function shouldIgnoreWebhookUpdate(args: {
  currentJob: DBVideoGenJob;
  incomingStatus: VideoStatus;
  incomingVideoUrl: string | null;
  incomingThumbnailUrl: string | null;
  incomingErrorMessage: string | null;
}): { ignore: boolean; reason?: string } {
  const {
    currentJob,
    incomingStatus,
    incomingVideoUrl,
    incomingThumbnailUrl,
    incomingErrorMessage
  } = args;

  const currentStatus = currentJob.status as VideoStatus;
  const currentTerminal = TERMINAL_VIDEO_STATUSES.has(currentStatus);
  const incomingTerminal = TERMINAL_VIDEO_STATUSES.has(incomingStatus);

  if (currentTerminal && incomingTerminal && currentStatus !== incomingStatus) {
    return { ignore: true, reason: "conflicting_terminal_status" };
  }

  if (
    currentStatus === incomingStatus &&
    (currentJob.videoUrl ?? null) === incomingVideoUrl &&
    (currentJob.thumbnailUrl ?? null) === incomingThumbnailUrl &&
    (currentJob.errorMessage ?? null) === incomingErrorMessage
  ) {
    return { ignore: true, reason: "idempotent_replay" };
  }

  return { ignore: false };
}

function scheduleListingRevalidation(listingId: string): void {
  setImmediate(() => {
    try {
      revalidatePath(`/listing/${listingId}`);
    } catch (error) {
      logger.error(
        {
          listingId,
          err: error instanceof Error ? error.message : String(error)
        },
        "Failed to revalidate listing path"
      );
    }
  });
}

type ProcessWebhookUpdateResult =
  | { outcome: "ok"; job: DBVideoGenJob }
  | { outcome: "not_found" }
  | { outcome: "update_failed"; job: DBVideoGenJob };

async function processWebhookUpdate(
  payload: VideoWebhookPayload,
  normalized: NormalizedWebhookResult
): Promise<ProcessWebhookUpdateResult> {
  const currentJob = await getVideoGenJobById(payload.jobId);
  if (!currentJob) {
    logger.warn(
      {
        listingId: payload.listingId,
        jobId: payload.jobId
      },
      "Video job not found for webhook update"
    );
    return { outcome: "not_found" };
  }

  const ignoreDecision = shouldIgnoreWebhookUpdate({
    currentJob,
    incomingStatus: payload.status as VideoStatus,
    incomingVideoUrl: normalized.videoUrl,
    incomingThumbnailUrl: normalized.thumbnailUrl,
    incomingErrorMessage: normalized.errorMessage
  });

  if (ignoreDecision.ignore) {
    logger.info(
      {
        listingId: payload.listingId,
        jobId: payload.jobId,
        status: payload.status,
        reason: ignoreDecision.reason
      },
      "Ignoring webhook update due to idempotency/transition guard"
    );
    return { outcome: "ok", job: currentJob };
  }

  try {
    await updateVideoGenJob(payload.jobId, {
      status: payload.status,
      videoUrl: normalized.videoUrl,
      thumbnailUrl: normalized.thumbnailUrl,
      errorMessage: normalized.errorMessage,
      metadata: normalized.metadata
    });
    const updated = await getVideoGenJobById(payload.jobId);
    return updated
      ? { outcome: "ok", job: updated }
      : { outcome: "ok", job: currentJob };
  } catch (error) {
    logger.error(
      {
        listingId: payload.listingId,
        jobId: payload.jobId,
        err: error instanceof Error ? error.message : String(error)
      },
      "Failed to persist video job update, using fallback data"
    );
    return { outcome: "update_failed", job: currentJob };
  }
}

/**
 * Process a verified video job webhook payload: normalize, apply idempotency rules,
 * update job in DB, and schedule listing revalidation.
 */
export async function processVideoWebhookPayload(
  payload: VideoWebhookPayload
): Promise<ProcessVideoWebhookResult> {
  const normalized = normalizeWebhookResult(payload);
  logger.info(
    {
      listingId: payload.listingId,
      jobId: payload.jobId,
      status: payload.status
    },
    "Video job webhook received"
  );

  const result = await processWebhookUpdate(payload, normalized);
  if (result.outcome === "not_found") {
    return { status: "not_found" };
  }
  if (result.outcome === "update_failed") {
    return { status: "update_failed" };
  }

  logger.info(
    {
      listingId: payload.listingId,
      jobId: payload.jobId,
      status: payload.status
    },
    "Video job status updated successfully"
  );

  scheduleListingRevalidation(payload.listingId);
  return { status: "ok" };
}

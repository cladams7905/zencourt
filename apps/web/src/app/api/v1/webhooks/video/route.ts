/**
 * Webhook endpoint for individual video job generation updates from video-server
 * Receives status updates when video jobs complete or fail
 *
 * POST /api/v1/webhooks/video
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  updateVideoGenJob,
  getVideoGenJobById
} from "@web/src/server/actions/db/videoGenJobs";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { VideoJobWebhookPayload } from "@shared/types/api";
import type { DBVideoGenJob } from "@shared/types/models";
import {
  parseVerifiedWebhook,
  WebhookVerificationError
} from "@web/src/server/utils/webhookVerification";
import type { VideoStatus } from "@shared/types/models";
import { apiErrorResponse, StatusCode } from "@web/src/app/api/v1/_responses";

const logger = createChildLogger(baseLogger, {
  module: "video-job-webhook"
});

const TERMINAL_VIDEO_STATUSES: ReadonlySet<VideoStatus> = new Set([
  "completed",
  "failed",
  "canceled"
]);

type ParsedWebhookPayload = VideoJobWebhookPayload & {
  generation?: {
    roomId?: string;
    roomName?: string;
    sortOrder?: number;
  };
};

type NormalizedWebhookResult = {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  metadata:
    | (NonNullable<DBVideoGenJob["metadata"]> & {
        duration?: number;
        fileSize?: number;
      })
    | undefined;
};

function normalizeWebhookResult(
  payload: ParsedWebhookPayload
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

  // Preserve terminal state integrity: once terminal, ignore conflicting terminal updates.
  if (currentTerminal && incomingTerminal && currentStatus !== incomingStatus) {
    return { ignore: true, reason: "conflicting_terminal_status" };
  }

  // Idempotent replay: same status + same persisted payload.
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

async function processWebhookUpdate(
  payload: ParsedWebhookPayload,
  normalized: NormalizedWebhookResult
): Promise<DBVideoGenJob | null | "not_found"> {
  try {
    const currentJob = await getVideoGenJobById(payload.jobId);
    if (!currentJob) {
      logger.warn(
        {
          listingId: payload.listingId,
          jobId: payload.jobId
        },
        "Video job not found for webhook update"
      );
      return "not_found";
    }

    const ignoreDecision = shouldIgnoreWebhookUpdate({
      currentJob,
      incomingStatus: payload.status,
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
      return currentJob;
    }

    return await updateVideoGenJob(payload.jobId, {
      status: payload.status,
      videoUrl: normalized.videoUrl,
      thumbnailUrl: normalized.thumbnailUrl,
      errorMessage: normalized.errorMessage,
      metadata: normalized.metadata
    });
  } catch (error) {
    logger.error(
      {
        listingId: payload.listingId,
        jobId: payload.jobId,
        err: error instanceof Error ? error.message : String(error)
      },
      "Failed to persist video job update, using fallback data"
    );
    return await getVideoGenJobById(payload.jobId);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await parseVerifiedWebhook<ParsedWebhookPayload>(request);
    const normalized = normalizeWebhookResult(payload);
    logger.info(
      {
        listingId: payload.listingId,
        jobId: payload.jobId,
        status: payload.status
      },
      "Video job webhook received"
    );

    const updatedJob = await processWebhookUpdate(payload, normalized);
    if (updatedJob === "not_found") {
      return apiErrorResponse(
        StatusCode.NOT_FOUND,
        "NOT_FOUND",
        "Video job not found for webhook update"
      );
    }

    logger.info(
      {
        listingId: payload.listingId,
        jobId: payload.jobId,
        status: payload.status
      },
      "Video job status updated successfully"
    );

    // Kick off route revalidation without blocking the webhook response
    scheduleListingRevalidation(payload.listingId);

    return NextResponse.json({
      success: Boolean(updatedJob),
      message: updatedJob
        ? "Video job status updated"
        : "Video job webhook processed without DB update"
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      logger.warn(
        {
          err: error.message
        },
        "Video job webhook failed verification"
      );
      return apiErrorResponse(
        error.status,
        "WEBHOOK_VERIFICATION_ERROR",
        error.message
      );
    }

    logger.error(
      {
        err: error instanceof Error ? error.message : String(error)
      },
      "Error processing video job webhook"
    );

    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

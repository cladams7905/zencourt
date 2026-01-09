/**
 * Webhook endpoint for individual video job generation updates from video-server
 * Receives status updates when video jobs complete or fail
 *
 * POST /api/v1/webhooks/video
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  updateVideoContentJob,
  getVideoContentJobById
} from "@web/src/server/actions/db/videoContentJobs";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";
import type { VideoJobWebhookPayload } from "@shared/types/api";
import type { DBVideoContentJob } from "@shared/types/models";
import {
  parseVerifiedWebhook,
  WebhookVerificationError
} from "@web/src/server/utils/webhookVerification";

const logger = createChildLogger(baseLogger, {
  module: "video-job-webhook"
});

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

export async function POST(request: NextRequest) {
  try {
    const payload = await parseVerifiedWebhook<
      VideoJobWebhookPayload & {
        generation?: {
          roomId?: string;
          roomName?: string;
          sortOrder?: number;
        };
      }
    >(request);
    const videoUrl = payload.result?.videoUrl ?? null;
    const thumbnailUrl = payload.result?.thumbnailUrl ?? null;
    const duration = payload.result?.duration ?? null;
    const fileSize = payload.result?.fileSize ?? null;
    const metadata = payload.result?.metadata;
    logger.info(
      {
        listingId: payload.listingId,
        jobId: payload.jobId,
        status: payload.status
      },
      "Video job webhook received"
    );

    let updatedJob: DBVideoContentJob | null = null;

    try {
      updatedJob = await updateVideoContentJob(payload.jobId, {
        status: payload.status,
        videoUrl,
        thumbnailUrl,
        errorMessage: payload.error?.message ?? null,
        metadata: metadata
          ? {
              ...metadata,
              duration: duration ?? undefined,
              fileSize: fileSize ?? undefined
            }
          : undefined
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
      updatedJob = await getVideoContentJobById(payload.jobId);
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
      return NextResponse.json(
        {
          success: false,
          error: error.message
        },
        { status: error.status }
      );
    }

    logger.error(
      {
        err: error instanceof Error ? error.message : String(error)
      },
      "Error processing video job webhook"
    );

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

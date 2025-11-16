/**
 * Webhook endpoint for individual video job generation updates from video-server
 * Receives status updates when video jobs complete or fail
 *
 * POST /api/v1/webhooks/video
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import {
  updateVideoJob,
  getVideoJobById
} from "@web/src/server/actions/db/videoJobs";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";
import { emitVideoJobUpdate } from "@web/src/types/video-events";
import type { VideoJobWebhookPayload } from "@shared/types/api";
import type { DBVideoJob } from "@shared/types/models";

const logger = createChildLogger(baseLogger, {
  module: "video-job-webhook"
});

function scheduleProjectRevalidation(projectId: string): void {
  setImmediate(() => {
    try {
      revalidatePath(`/project/${projectId}`);
    } catch (error) {
      logger.error(
        {
          projectId,
          err: error instanceof Error ? error.message : String(error)
        },
        "Failed to revalidate project path"
      );
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as VideoJobWebhookPayload & {
      generation?: {
        roomId?: string;
        roomName?: string;
        sortOrder?: number;
      };
    };
    const videoUrl = payload.result?.videoUrl ?? null;
    const thumbnailUrl = payload.result?.thumbnailUrl ?? null;
    const duration = payload.result?.duration ?? null;
    const fileSize = payload.result?.fileSize ?? null;
    const metadata = payload.result?.metadata;
    const generationInfo = payload.generation;

    logger.info(
      {
        projectId: payload.projectId,
        jobId: payload.jobId,
        status: payload.status
      },
      "Video job webhook received"
    );

    let updatedJob: DBVideoJob | null = null;

    try {
      updatedJob = await updateVideoJob(payload.jobId, {
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
          projectId: payload.projectId,
          jobId: payload.jobId,
          err: error instanceof Error ? error.message : String(error)
        },
        "Failed to persist video job update, using fallback data"
      );
      updatedJob = await getVideoJobById(payload.jobId);
    }

    logger.info(
      {
        projectId: payload.projectId,
        jobId: payload.jobId,
        status: payload.status
      },
      "Video job status updated successfully"
    );

    emitVideoJobUpdate({
      projectId: payload.projectId,
      jobId: updatedJob?.id ?? payload.jobId,
      status: updatedJob?.status ?? payload.status,
      videoUrl: updatedJob?.videoUrl ?? videoUrl,
      errorMessage:
        updatedJob?.errorMessage ?? payload.error?.message ?? null,
      roomId:
        generationInfo?.roomId ?? updatedJob?.generationSettings?.roomId ?? null,
      roomName:
        generationInfo?.roomName ??
        updatedJob?.generationSettings?.roomName ??
        null,
      sortOrder:
        generationInfo?.sortOrder ??
        updatedJob?.generationSettings?.sortOrder ??
        null
    });

    // Kick off route revalidation without blocking the webhook response
    scheduleProjectRevalidation(payload.projectId);

    return NextResponse.json({
      success: Boolean(updatedJob),
      message: updatedJob
        ? "Video job status updated"
        : "Video job webhook processed without DB update"
    });
  } catch (error) {
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

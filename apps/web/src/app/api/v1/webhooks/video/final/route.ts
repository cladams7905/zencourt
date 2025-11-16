/**
 * Webhook endpoint for final composed video updates from video-server
 * Receives status updates when the final video composition completes or fails
 *
 * POST /api/v1/webhooks/video/final
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { updateVideo } from "@web/src/server/actions/db/videos";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../../lib/logger";
import { emitFinalVideoUpdate } from "@web/src/types/video-events";

const logger = createChildLogger(baseLogger, {
  module: "final-video-webhook"
});

interface FinalVideoWebhookPayload {
  videoId: string;
  projectId: string;
  status: "completed" | "failed";
  timestamp: string;
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    fileSize?: number;
  };
  error?: {
    message: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload: FinalVideoWebhookPayload = await request.json();

    logger.info(
      {
        projectId: payload.projectId,
        status: payload.status
      },
      "Final video webhook received"
    );

    // Update the video record with final status
    const updatedVideo = await updateVideo(payload.videoId, {
      status: payload.status,
      videoUrl: payload.result?.videoUrl,
      thumbnailUrl: payload.result?.thumbnailUrl,
      metadata: payload.result
        ? {
            duration: payload.result.duration,
            fileSize: payload.result.fileSize
          }
        : undefined,
      errorMessage: payload.error?.message
    });

    logger.info(
      {
        projectId: payload.projectId,
        status: payload.status
      },
      "Final video status updated successfully"
    );

    emitFinalVideoUpdate({
      projectId: payload.projectId,
      status: payload.status,
      finalVideoUrl: updatedVideo.videoUrl,
      thumbnailUrl: updatedVideo.thumbnailUrl,
      duration: updatedVideo.metadata?.duration ?? null,
      errorMessage: payload.error?.message
    });

    // Revalidate the project page to reflect the final video
    revalidatePath(`/project/${payload.projectId}`);

    return NextResponse.json({
      success: true,
      message: "Final video status updated"
    });
  } catch (error) {
    logger.error(
      {
        err: error instanceof Error ? error.message : String(error)
      },
      "Error processing final video webhook"
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

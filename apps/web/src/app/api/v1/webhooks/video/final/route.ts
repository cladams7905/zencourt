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
import { ensurePublicUrl } from "@web/src/server/utils/storageUrls";

const logger = createChildLogger(baseLogger, {
  module: "final-video-webhook"
});

const FINAL_VIDEO_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

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
    const videoId = payload.videoId;

    logger.info(
      {
        projectId: payload.projectId,
        videoId,
        status: payload.status
      },
      "Final video webhook received"
    );

    let signedVideoUrl: string | undefined = undefined;
    let signedThumbnailUrl: string | undefined = undefined;

    if (payload.result?.videoUrl) {
      try {
        signedVideoUrl = await ensurePublicUrl(
          payload.result.videoUrl,
          FINAL_VIDEO_SIGNED_URL_TTL_SECONDS
        );
      } catch (error) {
        signedVideoUrl = payload.result.videoUrl;
        logger.error(
          {
            videoId,
            projectId: payload.projectId,
            err: error instanceof Error ? error.message : String(error)
          },
          "Failed to generate signed URL for final video, using original URL"
        );
      }
    }

    if (payload.result?.thumbnailUrl) {
      try {
        signedThumbnailUrl = await ensurePublicUrl(
          payload.result.thumbnailUrl,
          FINAL_VIDEO_SIGNED_URL_TTL_SECONDS
        );
      } catch (error) {
        signedThumbnailUrl = payload.result.thumbnailUrl;
        logger.error(
          {
            videoId,
            projectId: payload.projectId,
            err: error instanceof Error ? error.message : String(error)
          },
          "Failed to generate signed URL for final thumbnail, using original URL"
        );
      }
    }

    // Update the video record with final status
    const updatedVideo = await updateVideo(videoId, {
      status: payload.status,
      videoUrl: signedVideoUrl,
      thumbnailUrl: signedThumbnailUrl,
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
        videoId,
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

/**
 * Webhook endpoint for final composed video updates from video-server
 * Receives status updates when the final video composition completes or fails
 *
 * POST /api/v1/webhooks/video/final
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db, assets } from "@db/client";
import { eq } from "drizzle-orm";
import { updateVideo } from "@web/src/server/actions/db/videos";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../../lib/logger";
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

    if (updatedVideo.assetId) {
      const assetUpdates: Partial<typeof assets.$inferInsert> = {
        updatedAt: new Date()
      };

      const resolvedThumbnail =
        signedThumbnailUrl ?? updatedVideo.thumbnailUrl ?? undefined;

      if (resolvedThumbnail) {
        assetUpdates.thumbnailUrl = resolvedThumbnail;
      }

      if (payload.status === "completed") {
        assetUpdates.stage = "complete";
      }

      await db
        .update(assets)
        .set(assetUpdates)
        .where(eq(assets.id, updatedVideo.assetId));

      logger.info(
        {
          projectId: payload.projectId,
          videoId,
          assetId: updatedVideo.assetId,
          assetStage: assetUpdates.stage ?? "unchanged"
        },
        "Asset metadata updated after final video webhook"
      );
    }

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

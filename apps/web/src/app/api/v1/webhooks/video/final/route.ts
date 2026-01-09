/**
 * Webhook endpoint for final composed video updates from video-server
 * Receives status updates when the final video composition completes or fails
 *
 * POST /api/v1/webhooks/video/final
 */

import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db, content } from "@db/client";
import { eq } from "drizzle-orm";
import { updateVideoContent } from "@web/src/server/actions/db/videoContent";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../../lib/logger";
import { ensurePublicUrl } from "@web/src/server/utils/storageUrls";
import {
  parseVerifiedWebhook,
  WebhookVerificationError
} from "@web/src/server/utils/webhookVerification";

const logger = createChildLogger(baseLogger, {
  module: "final-video-webhook"
});

const FINAL_VIDEO_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

interface FinalVideoWebhookPayload {
  videoId: string;
  listingId: string;
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
    const payload = await parseVerifiedWebhook<FinalVideoWebhookPayload>(
      request
    );
    const videoId = payload.videoId;

    logger.info(
      {
        listingId: payload.listingId,
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
            listingId: payload.listingId,
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
            listingId: payload.listingId,
            err: error instanceof Error ? error.message : String(error)
          },
          "Failed to generate signed URL for final thumbnail, using original URL"
        );
      }
    }

    const updatedVideo = await updateVideoContent(videoId, {
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
        listingId: payload.listingId,
        videoId,
        status: payload.status
      },
      "Final video status updated successfully"
    );

    if (updatedVideo.contentId) {
      const contentUpdates: Partial<typeof content.$inferInsert> = {
        updatedAt: new Date()
      };

      const resolvedThumbnail =
        signedThumbnailUrl ?? updatedVideo.thumbnailUrl ?? undefined;

      if (resolvedThumbnail) {
        contentUpdates.thumbnailUrl = resolvedThumbnail;
      }

      await db
        .update(content)
        .set(contentUpdates)
        .where(eq(content.id, updatedVideo.contentId));

      logger.info(
        {
          listingId: payload.listingId,
          videoId,
          contentId: updatedVideo.contentId
        },
        "Content metadata updated after final video webhook"
      );
    }

    // Revalidate the listing page to reflect the final video
    revalidatePath(`/listing/${payload.listingId}`);

    return NextResponse.json({
      success: true,
      message: "Final video status updated"
    });
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      logger.warn(
        {
          err: error.message
        },
        "Final video webhook failed verification"
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

/**
 * Webhook endpoint for fal.ai callbacks
 *
 * This receives notifications when video generation completes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  downloadVideoFromUrl,
  getVideoByFalRequestId,
  markVideoCompleted,
  markVideoFailed
} from "../../../../../server/actions/db/videos";
import { db, projects } from "@db/client";
import { eq } from "drizzle-orm";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";

const logger = createChildLogger(baseLogger, { module: "fal-webhook-route" });

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for download/upload

interface FalWebhookPayload {
  request_id: string;
  gateway_request_id?: string;
  status: "OK" | "ERROR";
  payload?: {
    video?: {
      url: string;
      file_size: number;
      content_type: string;
    };
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    logger.info("========================================");
    logger.info(
      { receivedAt: new Date().toISOString() },
      "Fal webhook callback received"
    );
    logger.info(
      { headers: Object.fromEntries(request.headers.entries()) },
      "Fal webhook headers"
    );

    // Parse the webhook payload
    const body: FalWebhookPayload = await request.json();

    logger.info({ payload: body }, "Fal webhook payload");
    logger.info(
      { requestId: body.request_id, status: body.status },
      "Fal webhook metadata"
    );

    // TODO: Implement webhook signature verification for security
    // See: https://docs.fal.ai/model-apis/model-endpoints/webhooks#security

    const requestId = body.request_id;

    // Find the video record by fal request ID
    const videoRecord = await getVideoByFalRequestId(requestId);

    if (!videoRecord) {
      logger.error(
        { requestId },
        "Fal webhook video record not found for request ID"
      );
      return NextResponse.json(
        {
          success: false,
          error: "Video record not found"
        },
        { status: 404 }
      );
    }

    logger.info(
      {
        videoId: videoRecord.id,
        projectId: videoRecord.projectId,
        roomName: videoRecord.roomName
      },
      "Fal webhook matched existing video record"
    );

    if (body.status === "OK" && body.payload?.video) {
      logger.info(
        {
          videoUrl: body.payload.video.url,
          fileSize: body.payload.video.file_size
        },
        "Fal webhook video generation successful"
      );

      try {
        // Download video from fal.ai
        logger.info("Fal webhook downloading video from fal.ai");
        const videoBlob = await downloadVideoFromUrl(body.payload.video.url);
        logger.info(
          { size: videoBlob.size },
          "Fal webhook downloaded video successfully"
        );

        const projectResult = await db
          .select({ userId: projects.userId })
          .from(projects)
          .where(eq(projects.id, videoRecord.projectId))
          .limit(1);

        if (projectResult.length === 0) {
          throw new Error("Project not found");
        }

        const userId = projectResult[0].userId;

        // Upload to S3 via video-server
        logger.info("Fal webhook uploading video to S3 via video-server");

        // Convert blob to buffer for upload
        const arrayBuffer = await videoBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Get video-server config
        const videoServerUrl = process.env.VIDEO_SERVER_URL;
        const videoServerApiKey = process.env.VIDEO_SERVER_API_KEY;

        if (!videoServerUrl || !videoServerApiKey) {
          throw new Error(
            "VIDEO_SERVER_URL and VIDEO_SERVER_API_KEY must be configured"
          );
        }

        // Create form data for upload
        const formData = new FormData();
        const videoFile = new File([buffer], `${videoRecord.roomName}.mp4`, {
          type: "video/mp4"
        });
        formData.append("file", videoFile);
        formData.append("folder", "videos");
        formData.append("userId", userId);
        formData.append("projectId", videoRecord.projectId);
        formData.append("videoId", videoRecord.id);

        // Upload to video-server
        const uploadResponse = await fetch(`${videoServerUrl}/storage/upload`, {
          method: "POST",
          headers: {
            "x-api-key": videoServerApiKey
          },
          body: formData
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json().catch(() => ({}));
          throw new Error(errorData.error || "Video server upload failed");
        }

        const uploadResult = await uploadResponse.json();
        const videoUrl = uploadResult.url;

        logger.info({ videoUrl }, "Fal webhook upload complete");

        // Mark video as completed
        logger.info(
          { videoId: videoRecord.id, videoUrl },
          "Fal webhook marking video as completed"
        );

        await markVideoCompleted(videoRecord.id, videoUrl);

        logger.info(
          { videoId: videoRecord.id },
          "Fal webhook successfully marked video as completed"
        );

        // Verify the update by reading it back
        const { getVideosByProject } = await import(
          "../../../../../server/actions/db/videos"
        );
        const updatedRecords = await getVideosByProject(videoRecord.projectId);
        const updatedVideo = updatedRecords.find(
          (v) => v.id === videoRecord.id
        );

        logger.info(
          {
            videoId: videoRecord.id,
            verifiedStatus: updatedVideo?.status,
            hasVideoUrl: Boolean(updatedVideo?.videoUrl)
          },
          "Fal webhook verification result"
        );

        return NextResponse.json({
          success: true,
          message: "Video processed successfully",
          videoId: videoRecord.id,
          videoUrl: videoUrl,
          verifiedStatus: updatedVideo?.status
        });
      } catch (error) {
        logger.error(
          {
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : error
          },
          "Fal webhook error processing video"
        );

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await markVideoFailed(videoRecord.id, errorMessage);

        return NextResponse.json(
          {
            success: false,
            error: "Video processing failed",
            message: errorMessage
          },
          { status: 500 }
        );
      }
    } else if (body.status === "ERROR") {
      logger.error(
        { requestId: body.request_id, error: body.error },
        "Fal webhook reported generation failure"
      );

      await markVideoFailed(
        videoRecord.id,
        body.error || "Unknown fal.ai error"
      );

      return NextResponse.json({
        success: true,
        message: "Error webhook processed"
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error
      },
      "Fal webhook unhandled error"
    );

    // Return 200 to prevent retries for malformed requests
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 200 }
    );
  }
}

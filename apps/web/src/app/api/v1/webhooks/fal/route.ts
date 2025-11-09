/**
 * Webhook endpoint for fal.ai callbacks
 *
 * This receives notifications when video generation completes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  markVideoCompleted,
  markVideoFailed,
  getVideoByFalRequestId
} from "../../../../../server/actions/db/videos";
import { downloadVideoFromUrl } from "../../../../../server/services/s3Service";

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
    console.log("[FAL Webhook] ========================================");
    console.log(
      "[FAL Webhook] Received callback at:",
      new Date().toISOString()
    );
    console.log(
      "[FAL Webhook] Headers:",
      Object.fromEntries(request.headers.entries())
    );

    // Parse the webhook payload
    const body: FalWebhookPayload = await request.json();

    console.log("[FAL Webhook] Full payload:", JSON.stringify(body, null, 2));
    console.log("[FAL Webhook] Request ID:", body.request_id);
    console.log("[FAL Webhook] Status:", body.status);

    // TODO: Implement webhook signature verification for security
    // See: https://docs.fal.ai/model-apis/model-endpoints/webhooks#security

    const requestId = body.request_id;

    // Find the video record by fal request ID
    const videoRecord = await getVideoByFalRequestId(requestId);

    if (!videoRecord) {
      console.error(
        "[FAL Webhook] ❌ No video record found for request ID:",
        requestId
      );
      return NextResponse.json(
        {
          success: false,
          error: "Video record not found"
        },
        { status: 404 }
      );
    }

    console.log("[FAL Webhook] Found video record:", videoRecord.id);
    console.log("[FAL Webhook] Project:", videoRecord.projectId);
    console.log("[FAL Webhook] Room:", videoRecord.roomName);

    if (body.status === "OK" && body.payload?.video) {
      console.log("[FAL Webhook] ✓ Video generation successful");
      console.log("[FAL Webhook] Video URL:", body.payload.video.url);
      console.log("[FAL Webhook] File size:", body.payload.video.file_size);

      try {
        // Download video from fal.ai
        console.log("[FAL Webhook] Downloading video from fal.ai...");
        const videoBlob = await downloadVideoFromUrl(body.payload.video.url);
        console.log("[FAL Webhook] ✓ Downloaded video, size:", videoBlob.size);

        // Get project info to find userId
        const { db, projects } = await import("@/db");
        const { eq } = await import("drizzle-orm");

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
        console.log("[FAL Webhook] Uploading to S3 via video-server...");

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

        console.log("[FAL Webhook] ✓ Uploaded to:", videoUrl);

        // Mark video as completed
        console.log("[FAL Webhook] Marking video as completed in database...");
        console.log("[FAL Webhook]   videoId:", videoRecord.id);
        console.log("[FAL Webhook]   videoUrl:", videoUrl);

        await markVideoCompleted(videoRecord.id, videoUrl);

        console.log("[FAL Webhook] ✓ Marked video as completed in database");

        // Verify the update by reading it back
        const { getVideosByProject } = await import(
          "../../../../../server/actions/db/videos"
        );
        const updatedRecords = await getVideosByProject(videoRecord.projectId);
        const updatedVideo = updatedRecords.find(
          (v) => v.id === videoRecord.id
        );

        console.log(
          "[FAL Webhook] Verification - Updated video status:",
          updatedVideo?.status
        );
        console.log(
          "[FAL Webhook] Verification - Updated video URL:",
          updatedVideo?.videoUrl ? "present" : "missing"
        );

        return NextResponse.json({
          success: true,
          message: "Video processed successfully",
          videoId: videoRecord.id,
          videoUrl: videoUrl,
          verifiedStatus: updatedVideo?.status
        });
      } catch (error) {
        console.error("[FAL Webhook] ❌ Error processing video:", error);

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
      console.error("[FAL Webhook] ❌ Video generation failed");
      console.error("[FAL Webhook] Error:", body.error);

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
    console.error("[FAL Webhook] ❌ Unhandled error:", error);

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

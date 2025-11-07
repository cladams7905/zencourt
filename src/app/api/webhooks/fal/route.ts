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
} from "@/db/actions/videos";
import {
  uploadRoomVideo,
  downloadVideoFromUrl,
  executeStorageWithRetry
} from "@/services/storage";

export const runtime = 'nodejs';
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
    console.log("[FAL Webhook] Received callback at:", new Date().toISOString());
    console.log("[FAL Webhook] Headers:", Object.fromEntries(request.headers.entries()));

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
      console.error("[FAL Webhook] ❌ No video record found for request ID:", requestId);
      return NextResponse.json({
        success: false,
        error: "Video record not found"
      }, { status: 404 });
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
        // We need to import and query the project to get userId
        const { db } = await import("@/db");
        const { projects } = await import("@/db/schema");
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

        // Upload to Vercel Blob storage
        console.log("[FAL Webhook] Uploading to Vercel Blob...");
        const videoUrl = await executeStorageWithRetry(() =>
          uploadRoomVideo(
            videoBlob,
            {
              userId,
              projectId: videoRecord.projectId,
              videoId: videoRecord.id,
              roomId: videoRecord.roomId || undefined
            },
            videoRecord.roomName || "video"
          )
        );
        console.log("[FAL Webhook] ✓ Uploaded to:", videoUrl);

        // Mark video as completed
        await markVideoCompleted(videoRecord.id, videoUrl);
        console.log("[FAL Webhook] ✓ Marked video as completed");

        return NextResponse.json({
          success: true,
          message: "Video processed successfully",
          videoId: videoRecord.id
        });

      } catch (error) {
        console.error("[FAL Webhook] ❌ Error processing video:", error);

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        await markVideoFailed(videoRecord.id, errorMessage);

        return NextResponse.json({
          success: false,
          error: "Video processing failed",
          message: errorMessage
        }, { status: 500 });
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
    return NextResponse.json({
      error: "Webhook processing failed",
      message: error instanceof Error ? error.message : String(error)
    }, { status: 200 });
  }
}

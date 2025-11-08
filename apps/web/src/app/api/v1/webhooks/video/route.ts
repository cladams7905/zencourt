/**
 * API Route: Video Completion Webhook
 *
 * POST /api/v1/webhooks/v1/video
 * Receives webhook notifications from AWS Express server when video processing completes
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@zencourt/db";
import { projects } from "@zencourt/db";
import { eq } from "drizzle-orm";

// Force Node.js runtime for crypto support
export const runtime = "nodejs";

// Allow reasonable execution time
export const maxDuration = 60; // 1 minute

// ============================================================================
// Types
// ============================================================================

interface VideoCompletePayload {
  jobId: string;
  projectId: string;
  userId: string;
  status: "completed" | "failed";
  timestamp: string;
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    resolution: {
      width: number;
      height: number;
    };
  };
  error?: {
    message: string;
    type: string;
    retryable: boolean;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Verify webhook signature using HMAC-SHA256
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  // Use timing-safe comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Timing-safe string comparison
 */
function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

/**
 * Get webhook secret from environment
 */
function getWebhookSecret(): string {
  const secret = process.env.VIDEO_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "VIDEO_WEBHOOK_SECRET environment variable is not configured"
    );
  }
  return secret;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get("x-webhook-signature");
    const deliveryAttempt = request.headers.get("x-webhook-delivery-attempt");
    const webhookTimestamp = request.headers.get("x-webhook-timestamp");

    if (!signature) {
      console.error("[Webhook] Missing X-Webhook-Signature header");
      return NextResponse.json(
        {
          error: "Missing webhook signature",
          message: "X-Webhook-Signature header is required"
        },
        { status: 401 }
      );
    }

    // Get raw payload as text for signature verification
    const rawPayload = await request.text();
    const webhookSecret = getWebhookSecret();

    // Verify signature
    if (!verifyWebhookSignature(rawPayload, signature, webhookSecret)) {
      console.error("[Webhook] Invalid webhook signature");
      console.error("[Webhook] Signature:", signature);
      console.error("[Webhook] Payload length:", rawPayload.length);
      return NextResponse.json(
        {
          error: "Invalid signature",
          message: "Webhook signature verification failed"
        },
        { status: 401 }
      );
    }

    // Parse payload
    const payload: VideoCompletePayload = JSON.parse(rawPayload);
    const { jobId, projectId, userId, status, timestamp, result, error } =
      payload;

    console.log("[Webhook] ✓ Received video completion webhook");
    console.log("[Webhook] Job ID:", jobId);
    console.log("[Webhook] Project ID:", projectId);
    console.log("[Webhook] Status:", status);
    console.log("[Webhook] Delivery Attempt:", deliveryAttempt || "1");
    console.log("[Webhook] Timestamp:", webhookTimestamp || timestamp);

    // Validate required fields
    if (!jobId || !projectId || !userId || !status) {
      console.error("[Webhook] Missing required fields in payload");
      return NextResponse.json(
        {
          error: "Invalid payload",
          message:
            "Missing required fields: jobId, projectId, userId, or status"
        },
        { status: 400 }
      );
    }

    // Get project from database
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      console.error(`[Webhook] Project not found: ${projectId}`);
      // Return 200 to prevent retries for non-existent projects
      return NextResponse.json({
        success: true,
        message: "Project not found - ignoring webhook"
      });
    }

    // Verify user owns the project
    if (project.userId !== userId) {
      console.error(
        `[Webhook] User mismatch: project userId=${project.userId}, webhook userId=${userId}`
      );
      // Return 200 to prevent retries
      return NextResponse.json({
        success: true,
        message: "User mismatch - ignoring webhook"
      });
    }

    // Update project based on status
    if (status === "completed" && result) {
      console.log(
        `[Webhook] ✓ Video completed successfully for project ${projectId}`
      );
      console.log(`[Webhook] Video URL: ${result.videoUrl}`);
      console.log(`[Webhook] Duration: ${result.duration}s`);

      // TODO (Task 23): Update to use video_jobs table instead of projects table
      // For now, using existing fields in projects table
      await db
        .update(projects)
        .set({
          videoGenerationStatus: "completed",
          finalVideoUrl: result.videoUrl,
          finalVideoDuration: result.duration,
          // Store additional data in metadata
          metadata: {
            ...project.metadata,
            videoThumbnailUrl: result.thumbnailUrl,
            videoResolution: result.resolution,
            completedAt: timestamp
          },
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

      console.log(
        `[Webhook] ✓ Project ${projectId} updated with video results`
      );
    } else if (status === "failed" && error) {
      console.error(`[Webhook] ❌ Video failed for project ${projectId}`);
      console.error(`[Webhook] Error: ${error.message}`);
      console.error(`[Webhook] Error type: ${error.type}`);
      console.error(`[Webhook] Retryable: ${error.retryable}`);

      // TODO (Task 23): Update to use video_jobs table instead of projects table
      // For now, storing error in metadata
      await db
        .update(projects)
        .set({
          videoGenerationStatus: "failed",
          metadata: {
            ...project.metadata,
            error: {
              message: error.message,
              type: error.type,
              retryable: error.retryable,
              failedAt: timestamp
            }
          },
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId));

      console.log(`[Webhook] ✓ Project ${projectId} updated with error status`);
    } else {
      console.error(`[Webhook] Invalid webhook payload: status=${status}`);
      return NextResponse.json(
        {
          error: "Invalid payload",
          message: `Invalid status or missing result/error data`
        },
        { status: 400 }
      );
    }

    // TODO: Create video_jobs table entry (task 23)
    // For now, we're updating the projects table directly

    // Return 200 OK immediately to prevent retries
    return NextResponse.json({
      success: true,
      message: "Webhook processed successfully",
      jobId,
      projectId
    });
  } catch (error) {
    console.error("[Webhook] ❌ Error processing webhook:", error);
    console.error(
      "[Webhook] Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );

    // Return 500 to trigger retries from the video server
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to process webhook. Will retry."
      },
      { status: 500 }
    );
  }
}

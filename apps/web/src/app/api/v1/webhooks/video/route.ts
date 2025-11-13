/**
 * API Route: Video Completion Webhook
 *
 * POST /api/v1/webhooks/v1/video
 * Receives webhook notifications from AWS Express server when video processing completes
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db } from "@db/client";
import { projects } from "@db/client";
import { eq } from "drizzle-orm";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "video-webhook-route"
});

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
      logger.error("Video webhook missing X-Webhook-Signature header");
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
      logger.error(
        { signature, payloadLength: rawPayload.length },
        "Video webhook invalid signature"
      );
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

    logger.info(
      {
        jobId,
        projectId,
        status,
        deliveryAttempt: deliveryAttempt || "1",
        timestamp: webhookTimestamp || timestamp
      },
      "Video completion webhook received"
    );

    // Validate required fields
    if (!jobId || !projectId || !userId || !status) {
      logger.error("Video webhook missing required fields in payload");
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
      logger.error({ projectId }, "Video webhook project not found");
      // Return 200 to prevent retries for non-existent projects
      return NextResponse.json({
        success: true,
        message: "Project not found - ignoring webhook"
      });
    }

    // Verify user owns the project
    if (project.userId !== userId) {
      logger.error(
        { projectUserId: project.userId, webhookUserId: userId },
        "Video webhook user mismatch"
      );
      // Return 200 to prevent retries
      return NextResponse.json({
        success: true,
        message: "User mismatch - ignoring webhook"
      });
    }

    // Update project based on status
    if (status === "completed" && result) {
      logger.info(
        {
          projectId,
          videoUrl: result.videoUrl,
          duration: result.duration
        },
        "Video webhook reported successful completion"
      );

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

      logger.info(
        { projectId },
        "Video webhook project updated with video results"
      );
    } else if (status === "failed" && error) {
      logger.error(
        {
          projectId,
          errorMessage: error.message,
          errorType: error.type,
          retryable: error.retryable
        },
        "Video webhook reported failure"
      );

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

      logger.info(
        { projectId },
        "Video webhook project updated with error status"
      );
    } else {
      logger.error({ status }, "Video webhook invalid payload");
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
    logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error
      },
      "Video webhook failed to process request"
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

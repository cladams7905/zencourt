/**
 * API Route: Generate Video via AWS Express Server
 *
 * POST /api/v1/video/generate
 * Sends video processing request to AWS ECS-hosted Express server
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, and } from "drizzle-orm";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";
import { db, projects, videos } from "@db/client";
import { VideoGenerateRequest, VideoProcessPayload } from "@shared/types/api";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "video-generate-route"
});

// Force Node.js runtime
export const runtime = "nodejs";

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get video server configuration from environment
 */
function getVideoServerConfig() {
  const baseUrl = process.env.VIDEO_SERVER_URL;
  const apiKey = process.env.VIDEO_SERVER_API_KEY;
  const webhookSecret = process.env.VIDEO_WEBHOOK_SECRET;

  if (!baseUrl || !apiKey || !webhookSecret) {
    throw new Error(
      "VIDEO_SERVER_URL, VIDEO_SERVER_API_KEY, and VIDEO_WEBHOOK_SECRET must be configured"
    );
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    webhookSecret
  };
}

/**
 * Build webhook URL for video completion notifications
 */
function getWebhookUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  const baseUrl = vercelUrl
    ? `https://${vercelUrl}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return `${baseUrl}/api/v1/webhooks/video`;
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: VideoGenerateRequest = await request.json();
    const { projectId, compositionSettings } = body;

    // Authenticate and authorize
    const user = await requireAuthenticatedUser();
    await requireProjectAccess(projectId, user.id);

    // Validate composition settings
    if (
      !compositionSettings ||
      !compositionSettings.roomOrder ||
      compositionSettings.roomOrder.length === 0
    ) {
      throw new ApiError(400, {
        error: "Invalid composition settings",
        message:
          "compositionSettings.roomOrder is required and must not be empty"
      });
    }

    // Get project data
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    if (!project) {
      throw new ApiError(404, {
        error: "Project not found",
        message: `Project ${projectId} not found`
      });
    }

    // Fetch room videos from the videos table
    const roomVideos = await db
      .select()
      .from(videos)
      .where(
        and(eq(videos.projectId, projectId), eq(videos.status, "completed"))
      );

    // Extract room video URLs based on composition settings
    const roomVideoUrls = compositionSettings.roomOrder.map((roomId) => {
      const roomVideo = roomVideos.find((v) => v.roomId === roomId);
      if (!roomVideo || !roomVideo.videoUrl) {
        throw new ApiError(400, {
          error: "Missing room video",
          message: `Room ${roomId} does not have a completed video URL`
        });
      }
      return {
        roomId,
        url: roomVideo.videoUrl
      };
    });

    // Generate unique job ID
    const jobId = nanoid();

    // Get video server config
    const { baseUrl, apiKey, webhookSecret } = getVideoServerConfig();
    const webhookUrl = getWebhookUrl();

    // Build request payload for Express server
    const payload: VideoProcessPayload = {
      jobId,
      projectId,
      userId: user.id,
      roomVideoUrls,
      compositionSettings: {
        roomOrder: compositionSettings.roomOrder,
        musicUrl: compositionSettings.musicUrl || null,
        musicVolume: compositionSettings.musicVolume || 0.5,
        transitions: compositionSettings.transitions || null
      },
      webhookUrl,
      webhookSecret
    };

    // Send request to AWS Express server
    logger.info(
      {
        endpoint: `${baseUrl}/video/process`,
        jobId,
        projectId
      },
      "Sending video generation request to AWS server"
    );

    const response = await fetch(`${baseUrl}/video/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    const responseData = await response.json().catch(() => ({}));

    // Handle server errors
    if (!response.ok) {
      logger.error(
        { status: response.status, response: responseData },
        "AWS video server responded with error"
      );

      // Map AWS server errors to appropriate status codes
      if (response.status === 503) {
        throw new ApiError(503, {
          error: "Video processing queue is full",
          message:
            "The video processing server is currently at capacity. Please try again later."
        });
      }

      if (response.status >= 500) {
        throw new ApiError(502, {
          error: "Video processing server error",
          message:
            "The video processing server encountered an error. Please try again."
        });
      }

      throw new ApiError(response.status, {
        error: "Video processing request failed",
        message: responseData.error || "Failed to start video processing"
      });
    }

    logger.info({ jobId }, "Video generation job created");

    // Update project status to processing
    await db
      .update(projects)
      .set({
        videoGenerationStatus: "processing",
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));

    // Return 202 Accepted with job ID
    return NextResponse.json(
      {
        success: true,
        jobId,
        projectId,
        estimatedDuration: responseData.estimatedDuration,
        queuePosition: responseData.queuePosition,
        message: "Video generation request accepted"
      },
      { status: 202 }
    );
  } catch (error) {
    // Handle API errors
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes("fetch")) {
      logger.error(
        {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        },
        "Failed to connect to video processing server"
      );
      return NextResponse.json(
        {
          error: "Video processing server unreachable",
          message:
            "Unable to connect to the video processing server. Please try again later."
        },
        { status: 503 }
      );
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === "TimeoutError") {
      logger.error(
        {
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack
          }
        },
        "Video processing server timeout"
      );
      return NextResponse.json(
        {
          error: "Video processing server timeout",
          message:
            "The video processing server did not respond in time. Please try again."
        },
        { status: 504 }
      );
    }

    // Handle unexpected errors
    logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error
      },
      "Unexpected error in video generation"
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to start video generation. Please try again."
      },
      { status: 500 }
    );
  }
}

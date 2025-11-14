/**
 * API Route: Video Status Polling
 *
 * GET /api/v1/video/status/:jobId
 * Polls the current status of a video generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireAuthenticatedUser } from "../../../_utils";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../../lib/logger";
import { getVideoJobById } from "../../../../../../server/actions/db/videoJobs";
import { VideoStatus } from "@shared/types/models";

const logger = createChildLogger(baseLogger, {
  module: "video-status-route"
});

// Force Node.js runtime
export const runtime = "nodejs";

// Allow reasonable execution time
export const maxDuration = 30; // 30 seconds

// ============================================================================
// Types
// ============================================================================

interface VideoStatusResponse {
  success: true;
  jobId: string;
  projectId: string;
  status: VideoStatus;
  progress?: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    resolution?: {
      width: number;
      height: number;
    };
  };
  error?: {
    message: string;
    type: string;
    retryable: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// GET Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;

    if (!jobId) {
      throw new ApiError(400, {
        error: "Missing job ID",
        message: "Job ID is required"
      });
    }

    // Authenticate user
    const user = await requireAuthenticatedUser();

    // Query video_jobs table directly
    const job = await getVideoJobById(jobId);

    if (!job) {
      throw new ApiError(404, {
        error: "Job not found",
        message: `No job found with ID ${jobId}`
      });
    }

    // Verify user owns the job
    if (job.userId !== user.id) {
      throw new ApiError(403, {
        error: "Access denied",
        message: "You do not have permission to access this job"
      });
    }

    // Map database status to API status
    const statusMap: Record<string, VideoStatus> = {
      pending: "pending",
      processing: "processing",
      completed: "completed",
      failed: "failed",
      canceled: "failed"
    };

    const status = statusMap[job.status] || "pending";

    const response: VideoStatusResponse = {
      success: true,
      jobId,
      projectId: job.projectId,
      status,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString()
    };

    // Add progress
    response.progress = job.progress ?? 0;

    // Add result data if completed
    if (status === "completed" && job.videoUrl) {
      response.result = {
        videoUrl: job.videoUrl,
        thumbnailUrl: job.thumbnailUrl ?? undefined,
        duration: job.duration ?? 0,
        resolution: job.resolution ?? undefined
      };
    }

    // Add error data if failed
    if (
      (status === "failed" || job.status === "canceled") &&
      job.errorMessage
    ) {
      response.error = {
        message: job.errorMessage,
        type: job.errorType ?? "unknown",
        retryable: job.errorRetryable ?? false
      };
    }

    // Add time estimate if processing
    if (status === "processing" && job.startedAt) {
      const elapsed = Date.now() - new Date(job.startedAt).getTime();
      const estimatedTotal = 180000; // 3 minutes estimated total
      response.estimatedTimeRemaining = Math.max(
        5,
        Math.floor((estimatedTotal - elapsed) / 1000)
      );
    }

    logger.info(
      { jobId, status, projectId: job.projectId },
      "Video status check from video_jobs table"
    );

    return NextResponse.json(response);
  } catch (error) {
    // Handle API errors
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    // Handle unexpected errors
    logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : error
      },
      "Error checking video status"
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to check video status. Please try again."
      },
      { status: 500 }
    );
  }
}

/**
 * API Route: Video Status Polling
 *
 * GET /api/v1/video/status/:jobId
 * Polls the current status of a video generation job
 */

import { NextRequest, NextResponse } from "next/server";
import { db, projects } from "@db/client";
import { eq } from "drizzle-orm";
import { ApiError, requireAuthenticatedUser } from "../../../_utils";
import { ProjectMetadata } from "@shared/types/models";

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
  status: "pending" | "processing" | "completed" | "failed";
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

    // TODO (Task 23): Query video_jobs table instead of projects
    // For now, we need to find the project by looking at metadata or other fields
    // Since we don't have a direct job ID mapping yet, we'll need to use the project status

    // Extract project ID from job ID if it's embedded, or query based on status
    // This is a temporary workaround until video_jobs table is created
    const projectId = request.nextUrl.searchParams.get("projectId");

    if (!projectId) {
      throw new ApiError(400, {
        error: "Missing project ID",
        message:
          "Project ID is required as query parameter until video_jobs table is created"
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
        error: "Job not found",
        message: `No job found with ID ${jobId}`
      });
    }

    // Verify user owns the project
    if (project.userId !== user.id) {
      throw new ApiError(403, {
        error: "Access denied",
        message: "You do not have permission to access this job"
      });
    }

    // Build response based on current project status
    const status = project.videoGenerationStatus as
      | "pending"
      | "processing"
      | "completed"
      | "failed"
      | null;
    const metadata = project.metadata as ProjectMetadata | null;

    const response: VideoStatusResponse = {
      success: true,
      jobId,
      projectId: project.id,
      status: status || "pending",
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString()
    };

    // Add result data if completed
    if (status === "completed" && project.finalVideoUrl) {
      response.result = {
        videoUrl: project.finalVideoUrl,
        thumbnailUrl: metadata?.videoThumbnailUrl,
        duration: project.finalVideoDuration || 0,
        resolution: metadata?.videoResolution
      };
      response.progress = 100;
    }

    // Add error data if failed
    if (status === "failed" && metadata?.error) {
      response.error = {
        message: metadata.error.message,
        type: metadata.error.type,
        retryable: metadata.error.retryable
      };
      response.progress = 0;
    }

    // Add progress estimate if processing
    if (status === "processing") {
      // Estimate progress based on time elapsed
      // This is a rough estimate until we have real progress updates
      const elapsed = Date.now() - project.updatedAt.getTime();
      const estimatedTotal = 180000; // 3 minutes estimated total
      response.progress = Math.min(
        95,
        Math.floor((elapsed / estimatedTotal) * 100)
      );
      response.estimatedTimeRemaining = Math.max(
        5,
        Math.floor((estimatedTotal - elapsed) / 1000)
      );
    }

    console.log(`[API] Video status check: jobId=${jobId}, status=${status}`);

    return NextResponse.json(response);
  } catch (error) {
    // Handle API errors
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    // Handle unexpected errors
    console.error("[API] ❌ Error checking video status:", error);
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

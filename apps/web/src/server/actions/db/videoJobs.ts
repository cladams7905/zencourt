"use server";

import { eq, and, desc } from "drizzle-orm";
import type {
  InsertDBVideoJob,
  DBVideoJob as VideoJob,
  VideoStatus
} from "@shared/types/models";
import { db, videoJobs } from "@db/client";
import { withDbErrorHandling } from "../_utils";
import { getUser } from "./users";

/**
 * Create a new video job record
 */
export async function createVideoJob(
  params: InsertDBVideoJob
): Promise<VideoJob> {
  if (!params.projectId) {
    throw new Error("Project ID is required");
  }
  if (!params.userId) {
    throw new Error("User ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();
      const [job] = await db.insert(videoJobs).values(params).returning();
      return job as VideoJob;
    },
    {
      actionName: "createVideoJob",
      context: { projectId: params.projectId },
      errorMessage: "Failed to create video job. Please try again."
    }
  );
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all video jobs for a project
 */
export async function getVideoJobsByProject(
  projectId: string
): Promise<VideoJob[]> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const jobs = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.projectId, projectId))
        .orderBy(desc(videoJobs.createdAt));

      return jobs as VideoJob[];
    },
    {
      actionName: "getVideoJobsByProject",
      context: { projectId },
      errorMessage: "Failed to get video jobs. Please try again."
    }
  );
}

/**
 * Get a specific video job by ID
 */
export async function getVideoJobById(jobId: string): Promise<VideoJob | null> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [job] = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.id, jobId))
        .limit(1);

      return (job as VideoJob) || null;
    },
    {
      actionName: "getVideoJobById",
      context: { jobId },
      errorMessage: "Failed to get video job. Please try again."
    }
  );
}

/**
 * Get video jobs by status for a project
 */
export async function getVideoJobsByStatus(
  projectId: string,
  status: VideoStatus
): Promise<VideoJob[]> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const jobs = await db
        .select()
        .from(videoJobs)
        .where(
          and(eq(videoJobs.projectId, projectId), eq(videoJobs.status, status))
        )
        .orderBy(desc(videoJobs.createdAt));

      return jobs as VideoJob[];
    },
    {
      actionName: "getVideoJobsByStatus",
      context: { projectId, status },
      errorMessage: "Failed to get video jobs by status. Please try again."
    }
  );
}

/**
 * Get all video jobs for a user
 */
export async function getVideoJobsByUser(userId: string): Promise<VideoJob[]> {
  if (!userId) {
    throw new Error("User ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const jobs = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.userId, userId))
        .orderBy(desc(videoJobs.createdAt));

      return jobs as VideoJob[];
    },
    {
      actionName: "getVideoJobsByUser",
      context: { userId },
      errorMessage: "Failed to get user video jobs. Please try again."
    }
  );
}

/**
 * Get the latest video job for a project
 */
export async function getLatestVideoJob(
  projectId: string
): Promise<VideoJob | null> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [job] = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.projectId, projectId))
        .orderBy(desc(videoJobs.createdAt))
        .limit(1);

      return (job as VideoJob) || null;
    },
    {
      actionName: "getLatestVideoJob",
      context: { projectId },
      errorMessage: "Failed to get latest video job. Please try again."
    }
  );
}

// ============================================================================
// Update Operations
// ============================================================================

/**
 * Update a video job record
 */
export async function updateVideoJob(
  jobId: string,
  updates: Partial<InsertDBVideoJob>
): Promise<void> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      await db
        .update(videoJobs)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, jobId));
    },
    {
      actionName: "updateVideoJob",
      context: { jobId },
      errorMessage: "Failed to update video job. Please try again."
    }
  );
}

/**
 * Update video job progress
 */
export async function updateVideoJobProgress(
  jobId: string,
  progress: number
): Promise<void> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }
  if (progress < 0 || progress > 100) {
    throw new Error("Progress must be between 0 and 100");
  }

  return withDbErrorHandling(
    async () => {
      await db
        .update(videoJobs)
        .set({
          progress,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, jobId));
    },
    {
      actionName: "updateVideoJobProgress",
      context: { jobId, progress },
      errorMessage: "Failed to update video job progress. Please try again."
    }
  );
}

/**
 * Mark video job as processing
 */
export async function markVideoJobProcessing(jobId: string): Promise<void> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await db
        .update(videoJobs)
        .set({
          status: "processing",
          startedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, jobId));
    },
    {
      actionName: "markVideoJobProcessing",
      context: { jobId },
      errorMessage: "Failed to mark video job as processing. Please try again."
    }
  );
}

/**
 * Mark video job as completed with final video data
 */
export async function markVideoJobCompleted(
  jobId: string,
  videoUrl: string,
  duration?: number,
  thumbnailUrl?: string,
  resolution?: { width: number; height: number }
): Promise<void> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }
  if (!videoUrl) {
    throw new Error("Video URL is required");
  }

  return withDbErrorHandling(
    async () => {
      await db
        .update(videoJobs)
        .set({
          status: "completed",
          progress: 100,
          videoUrl,
          duration,
          thumbnailUrl,
          resolution,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, jobId));
    },
    {
      actionName: "markVideoJobCompleted",
      context: { jobId, videoUrl },
      errorMessage: "Failed to mark video job as completed. Please try again."
    }
  );
}

/**
 * Mark video job as failed with error details
 */
export async function markVideoJobFailed(
  jobId: string,
  errorMessage: string,
  errorType?: string,
  errorRetryable?: boolean
): Promise<void> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await db
        .update(videoJobs)
        .set({
          status: "failed",
          errorMessage,
          errorType,
          errorRetryable,
          completedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, jobId));
    },
    {
      actionName: "markVideoJobFailed",
      context: { jobId, errorMessage },
      errorMessage: "Failed to mark video job as failed. Please try again."
    }
  );
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete a video job by ID
 */
export async function deleteVideoJob(jobId: string): Promise<void> {
  if (!jobId) {
    throw new Error("Job ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      await db.delete(videoJobs).where(eq(videoJobs.id, jobId));
    },
    {
      actionName: "deleteVideoJob",
      context: { jobId },
      errorMessage: "Failed to delete video job. Please try again."
    }
  );
}

/**
 * Delete all video jobs for a project (cascade on project delete handles this automatically)
 */
export async function deleteVideoJobsByProject(
  projectId: string
): Promise<void> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      await db.delete(videoJobs).where(eq(videoJobs.projectId, projectId));
    },
    {
      actionName: "deleteVideoJobsByProject",
      context: { projectId },
      errorMessage: "Failed to delete video jobs. Please try again."
    }
  );
}

// ============================================================================
// Utility Operations
// ============================================================================

/**
 * Get video job statistics for a project
 */
export async function getVideoJobStats(projectId: string): Promise<{
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  averageProgress: number;
}> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const jobs = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.projectId, projectId));

      const stats = {
        total: jobs.length,
        pending: jobs.filter((j) => j.status === "pending").length,
        processing: jobs.filter((j) => j.status === "processing").length,
        completed: jobs.filter((j) => j.status === "completed").length,
        failed: jobs.filter((j) => j.status === "failed").length,
        averageProgress:
          jobs.length > 0
            ? Math.round(
                jobs.reduce((sum, j) => sum + (j.progress || 0), 0) /
                  jobs.length
              )
            : 0
      };

      return stats;
    },
    {
      actionName: "getVideoJobStats",
      context: { projectId },
      errorMessage: "Failed to get video job statistics. Please try again."
    }
  );
}

/**
 * Check if any video job is currently processing for a project
 */
export async function hasActiveVideoJob(projectId: string): Promise<boolean> {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [job] = await db
        .select()
        .from(videoJobs)
        .where(
          and(
            eq(videoJobs.projectId, projectId),
            eq(videoJobs.status, "processing")
          )
        )
        .limit(1);

      return !!job;
    },
    {
      actionName: "hasActiveVideoJob",
      context: { projectId },
      errorMessage: "Failed to check active video job status. Please try again."
    }
  );
}

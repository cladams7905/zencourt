"use server";

import { db, eq, videoGenJobs } from "@db/client";
import type {
  DBVideoGenJob,
  InsertDBVideoGenJob
} from "@db/types/models";
import { requireNonEmptyString } from "./shared/validation";
import { withDbErrorHandling } from "./shared/dbErrorHandling";

/**
 * Create a new video generation job record
 */
export async function createVideoGenJob(
  job: InsertDBVideoGenJob
): Promise<void> {
  return withDbErrorHandling(
    async () => {
      await db.insert(videoGenJobs).values(job);
    },
    {
      actionName: "createVideoGenJob",
      context: { jobId: job.id, videoGenBatchId: job.videoGenBatchId },
      errorMessage: "Failed to create video generation job. Please try again."
    }
  );
}

/**
 * Create multiple video generation job records in a single write
 */
export async function createVideoGenJobsBatch(
  jobs: InsertDBVideoGenJob[]
): Promise<void> {
  if (jobs.length === 0) {
    return;
  }

  return withDbErrorHandling(
    async () => {
      await db.insert(videoGenJobs).values(jobs);
    },
    {
      actionName: "createVideoGenJobsBatch",
      context: { count: jobs.length },
      errorMessage:
        "Failed to create video generation jobs. Please try again."
    }
  );
}

/**
 * Update an existing video generation job record
 */
export async function updateVideoGenJob(
  jobId: string,
  updates: Partial<
    Omit<
      InsertDBVideoGenJob,
      "id" | "videoGenBatchId" | "createdAt" | "updatedAt"
    >
  >
): Promise<DBVideoGenJob> {
  requireNonEmptyString(jobId, "jobId is required");

  return withDbErrorHandling(
    async () => {
      const [updated] = await db
        .update(videoGenJobs)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(videoGenJobs.id, jobId))
        .returning();

      if (!updated) {
        throw new Error(`Video generation job ${jobId} not found`);
      }

      return updated;
    },
    {
      actionName: "updateVideoGenJob",
      context: { jobId },
      errorMessage: "Failed to update video generation job. Please try again."
    }
  );
}

/**
 * Fetch a video generation job by id
 */
export async function getVideoGenJobById(
  jobId: string
): Promise<DBVideoGenJob | null> {
  requireNonEmptyString(jobId, "jobId is required");

  return withDbErrorHandling(
    async () => {
      const [job] = await db
        .select()
        .from(videoGenJobs)
        .where(eq(videoGenJobs.id, jobId))
        .limit(1);

      return job ?? null;
    },
    {
      actionName: "getVideoGenJobById",
      context: { jobId },
      errorMessage: "Failed to load video generation job. Please try again."
    }
  );
}

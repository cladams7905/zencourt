"use server";

import { db, eq, videoGenBatch, videoGenJobs } from "@db/client";
import type { DBVideoGenBatch, DBVideoGenJob, InsertDBVideoGenBatch, InsertDBVideoGenJob } from "@db/types/models";
import { requireNonEmptyString } from "../shared/validation";
import { withDbErrorHandling } from "../shared/dbErrorHandling";
import type { VideoGenBatchUpdates, VideoGenJobUpdates } from "./types";

export async function createVideoGenBatch(
  video: InsertDBVideoGenBatch
): Promise<void> {
  return withDbErrorHandling(
    async () => {
      await db.insert(videoGenBatch).values(video);
    },
    {
      actionName: "createVideoGenBatch",
      context: { id: video.id, listingId: video.listingId },
      errorMessage:
        "Failed to create video generation batch. Please try again."
    }
  );
}

export async function updateVideoGenBatch(
  videoId: string,
  updates: VideoGenBatchUpdates
): Promise<DBVideoGenBatch> {
  requireNonEmptyString(videoId, "videoId is required");

  return withDbErrorHandling(
    async () => {
      const [updated] = await db
        .update(videoGenBatch)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(videoGenBatch.id, videoId))
        .returning();

      if (!updated) {
        throw new Error(`Video generation batch ${videoId} not found`);
      }

      return updated;
    },
    {
      actionName: "updateVideoGenBatch",
      context: { videoId },
      errorMessage:
        "Failed to update video generation batch. Please try again."
    }
  );
}

export async function createVideoGenJob(job: InsertDBVideoGenJob): Promise<void> {
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

export async function updateVideoGenJob(
  jobId: string,
  updates: VideoGenJobUpdates
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

"use server";

import { and, db, eq, videoGenBatch, videoGenJobs, clipVersions } from "@db/client";
import type {
  DBClipVersion,
  DBVideoGenBatch,
  DBVideoGenJob,
  InsertDBClipVersion,
  InsertDBVideoGenBatch,
  InsertDBVideoGenJob
} from "@db/types/models";
import { requireNonEmptyString } from "../shared/validation";
import { withDbErrorHandling } from "../shared/dbErrorHandling";
import type {
  ClipVersionUpdates,
  VideoGenBatchUpdates,
  VideoGenJobUpdates
} from "./types";

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

export async function createClipVersion(
  clipVersion: InsertDBClipVersion
): Promise<void> {
  return withDbErrorHandling(
    async () => {
      await db.insert(clipVersions).values(clipVersion);
    },
    {
      actionName: "createClipVersion",
      context: { clipVersionId: clipVersion.id, listingId: clipVersion.listingId },
      errorMessage: "Failed to create clip version. Please try again."
    }
  );
}

export async function updateClipVersion(
  clipVersionId: string,
  updates: ClipVersionUpdates
): Promise<DBClipVersion> {
  requireNonEmptyString(clipVersionId, "clipVersionId is required");

  return withDbErrorHandling(
    async () => {
      const [updated] = await db
        .update(clipVersions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(clipVersions.id, clipVersionId))
        .returning();

      if (!updated) {
        throw new Error(`Clip version ${clipVersionId} not found`);
      }

      return updated;
    },
    {
      actionName: "updateClipVersion",
      context: { clipVersionId },
      errorMessage: "Failed to update clip version. Please try again."
    }
  );
}

export async function markClipVersionAsCurrent(args: {
  clipVersionId: string;
  listingId: string;
  clipId: string;
}): Promise<DBClipVersion[]> {
  const { clipVersionId, listingId, clipId } = args;
  requireNonEmptyString(clipVersionId, "clipVersionId is required");
  requireNonEmptyString(listingId, "listingId is required");
  requireNonEmptyString(clipId, "clipId is required");

  return withDbErrorHandling(
    async () => {
      await db
        .update(clipVersions)
        .set({
          isCurrent: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(clipVersions.listingId, listingId),
            eq(clipVersions.clipId, clipId),
            eq(clipVersions.isCurrent, true)
          )
        );

      return await db
        .update(clipVersions)
        .set({
          isCurrent: true,
          updatedAt: new Date()
        })
        .where(eq(clipVersions.id, clipVersionId))
        .returning();
    },
    {
      actionName: "markClipVersionAsCurrent",
      context: { clipVersionId, listingId, clipId },
      errorMessage: "Failed to mark clip version as current. Please try again."
    }
  );
}

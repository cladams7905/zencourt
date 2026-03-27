"use server";

import { db, desc, eq, videoGenBatch, videoGenJobs } from "@db/client";
import type { DBVideoGenBatch, DBVideoGenJob } from "@db/types/models";
import { requireNonEmptyString } from "../../shared/validation";
import { withDbErrorHandling } from "../../shared/dbErrorHandling";

export async function getVideoGenJobById(jobId: string): Promise<DBVideoGenJob | null> {
  requireNonEmptyString(jobId, "jobId is required");

  return withDbErrorHandling(
    async () => {
      const [job] = await db.select().from(videoGenJobs).where(eq(videoGenJobs.id, jobId)).limit(1);
      return job ?? null;
    },
    {
      actionName: "getVideoGenJobById",
      context: { jobId },
      errorMessage: "Failed to load video generation job. Please try again."
    }
  );
}

export async function getVideoGenBatchById(batchId: string): Promise<DBVideoGenBatch | null> {
  requireNonEmptyString(batchId, "batchId is required");

  return withDbErrorHandling(
    async () => {
      const [batch] = await db.select().from(videoGenBatch).where(eq(videoGenBatch.id, batchId)).limit(1);
      return batch ?? null;
    },
    {
      actionName: "getVideoGenBatchById",
      context: { batchId },
      errorMessage: "Failed to load video generation batch. Please try again."
    }
  );
}

export async function getLatestVideoGenBatchByListingId(
  listingId: string
): Promise<DBVideoGenBatch | null> {
  requireNonEmptyString(listingId, "listingId is required");

  return withDbErrorHandling(
    async () => {
      const [batch] = await db
        .select()
        .from(videoGenBatch)
        .where(eq(videoGenBatch.listingId, listingId))
        .orderBy(desc(videoGenBatch.createdAt))
        .limit(1);

      return batch ?? null;
    },
    {
      actionName: "getLatestVideoGenBatchByListingId",
      context: { listingId },
      errorMessage: "Failed to load latest video generation batch. Please try again."
    }
  );
}

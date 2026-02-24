"use server";

import { db, eq, videoGenJobs } from "@db/client";
import type {
  DBVideoGenJob,
  InsertDBVideoGenJob
} from "@db/types/models";
import { requireNonEmptyString } from "./shared/validation";

/**
 * Create a new video generation job record
 */
export async function createVideoGenJob(
  job: InsertDBVideoGenJob
): Promise<void> {
  await db.insert(videoGenJobs).values(job);
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

  await db.insert(videoGenJobs).values(jobs);
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
}

/**
 * Fetch a video generation job by id
 */
export async function getVideoGenJobById(
  jobId: string
): Promise<DBVideoGenJob | null> {
  requireNonEmptyString(jobId, "jobId is required");

  const [job] = await db
    .select()
    .from(videoGenJobs)
    .where(eq(videoGenJobs.id, jobId))
    .limit(1);

  return job ?? null;
}

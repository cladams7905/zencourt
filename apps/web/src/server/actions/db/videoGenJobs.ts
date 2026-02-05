"use server";

import { db, videoGenJobs } from "@db/client";
import type {
  DBVideoGenJob,
  InsertDBVideoGenJob
} from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video generation job record
 */
export async function createVideoGenJob(
  job: InsertDBVideoGenJob
): Promise<void> {
  await db.insert(videoGenJobs).values(job);
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
  const [job] = await db
    .select()
    .from(videoGenJobs)
    .where(eq(videoGenJobs.id, jobId))
    .limit(1);

  return job ?? null;
}

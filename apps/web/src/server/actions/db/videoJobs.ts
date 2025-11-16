"use server";

import { db, videoJobs } from "@db/client";
import type { DBVideoJob, InsertDBVideoJob } from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video job record
 */
export async function createVideoJob(job: InsertDBVideoJob): Promise<void> {
  await db.insert(videoJobs).values(job);
}

/**
 * Update an existing video job record
 */
export async function updateVideoJob(
  jobId: string,
  updates: Partial<
    Omit<InsertDBVideoJob, "id" | "videoId" | "createdAt" | "updatedAt">
  >
): Promise<DBVideoJob> {
  const [updated] = await db
    .update(videoJobs)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(videoJobs.id, jobId))
    .returning();

  if (!updated) {
    throw new Error(`Video job ${jobId} not found`);
  }

  return updated;
}

/**
 * Fetch a video job by id
 */
export async function getVideoJobById(
  jobId: string
): Promise<DBVideoJob | null> {
  const [job] = await db
    .select()
    .from(videoJobs)
    .where(eq(videoJobs.id, jobId))
    .limit(1);

  return job ?? null;
}

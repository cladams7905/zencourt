"use server";

import { db, videoAssetJobs } from "@db/client";
import type { DBVideoJob, InsertDBVideoJob } from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video asset job record
 */
export async function createVideoAssetJob(
  job: InsertDBVideoJob
): Promise<void> {
  await db.insert(videoAssetJobs).values(job);
}

/**
 * Update an existing video asset job record
 */
export async function updateVideoAssetJob(
  jobId: string,
  updates: Partial<
    Omit<InsertDBVideoJob, "id" | "videoAssetId" | "createdAt" | "updatedAt">
  >
): Promise<DBVideoJob> {
  const [updated] = await db
    .update(videoAssetJobs)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(videoAssetJobs.id, jobId))
    .returning();

  if (!updated) {
    throw new Error(`Video asset job ${jobId} not found`);
  }

  return updated;
}

/**
 * Fetch a video asset job by id
 */
export async function getVideoAssetJobById(
  jobId: string
): Promise<DBVideoJob | null> {
  const [job] = await db
    .select()
    .from(videoAssetJobs)
    .where(eq(videoAssetJobs.id, jobId))
    .limit(1);

  return job ?? null;
}

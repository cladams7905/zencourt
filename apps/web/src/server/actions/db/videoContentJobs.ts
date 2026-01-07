"use server";

import { db, videoContentJobs } from "@db/client";
import type {
  DBVideoContentJob,
  InsertDBVideoContentJob
} from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video content job record
 */
export async function createVideoContentJob(
  job: InsertDBVideoContentJob
): Promise<void> {
  await db.insert(videoContentJobs).values(job);
}

/**
 * Update an existing video content job record
 */
export async function updateVideoContentJob(
  jobId: string,
  updates: Partial<
    Omit<
      InsertDBVideoContentJob,
      "id" | "videoContentId" | "createdAt" | "updatedAt"
    >
  >
): Promise<DBVideoContentJob> {
  const [updated] = await db
    .update(videoContentJobs)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(videoContentJobs.id, jobId))
    .returning();

  if (!updated) {
    throw new Error(`Video content job ${jobId} not found`);
  }

  return updated;
}

/**
 * Fetch a video content job by id
 */
export async function getVideoContentJobById(
  jobId: string
): Promise<DBVideoContentJob | null> {
  const [job] = await db
    .select()
    .from(videoContentJobs)
    .where(eq(videoContentJobs.id, jobId))
    .limit(1);

  return job ?? null;
}

"use server";

import { db, videoJobs } from "@db/client";
import type { InsertDBVideoJob } from "@shared/types/models";

/**
 * Create a new video job record
 */
export async function createVideoJob(job: InsertDBVideoJob): Promise<void> {
  await db.insert(videoJobs).values(job);
}

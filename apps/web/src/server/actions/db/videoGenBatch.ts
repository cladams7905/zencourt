"use server";

import { db, eq, videoGenBatch } from "@db/client";
import type {
  DBVideoGenBatch,
  InsertDBVideoGenBatch
} from "@shared/types/models";
import { requireNonEmptyString } from "../shared/validation";

/**
 * Create a new video generation batch record
 */
export async function createVideoGenBatch(
  video: InsertDBVideoGenBatch
): Promise<void> {
  await db.insert(videoGenBatch).values(video);
}

/**
 * Update an existing video generation batch record
 */
export async function updateVideoGenBatch(
  videoId: string,
  updates: Partial<
    Omit<InsertDBVideoGenBatch, "id" | "listingId" | "createdAt">
  >
): Promise<DBVideoGenBatch> {
  requireNonEmptyString(videoId, "videoId is required");

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
}

"use server";

import { db, eq, videoGenBatch } from "@db/client";
import type {
  DBVideoGenBatch,
  InsertDBVideoGenBatch
} from "@db/types/models";
import { requireNonEmptyString } from "./shared/validation";
import { withDbErrorHandling } from "./shared/dbErrorHandling";

/**
 * Create a new video generation batch record
 */
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

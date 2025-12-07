"use server";

import { db, videoAssets } from "@db/client";
import type { DBVideo, InsertDBVideo } from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video asset record
 */
export async function createVideoAsset(
  video: InsertDBVideo
): Promise<void> {
  await db.insert(videoAssets).values(video);
}

/**
 * Update an existing video asset record
 */
export async function updateVideoAsset(
  videoId: string,
  updates: Partial<Omit<InsertDBVideo, "id" | "assetId" | "createdAt">>
): Promise<DBVideo> {
  if (!videoId) {
    throw new Error("videoId is required");
  }

  const [updated] = await db
    .update(videoAssets)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(videoAssets.id, videoId))
    .returning();

  if (!updated) {
    throw new Error(`Video asset ${videoId} not found`);
  }

  return updated;
}

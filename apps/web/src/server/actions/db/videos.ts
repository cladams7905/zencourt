"use server";

import { db, videos } from "@db/client";
import type { DBVideo, InsertDBVideo } from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video record
 */
export async function createVideo(video: InsertDBVideo): Promise<void> {
  await db.insert(videos).values(video);
}

/**
 * Update an existing video record
 */
export async function updateVideo(
  videoId: string,
  updates: Partial<Omit<InsertDBVideo, "id" | "projectId" | "createdAt">>
): Promise<DBVideo> {
  if (!videoId) {
    throw new Error("videoId is required");
  }

  const [updated] = await db
    .update(videos)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(videos.id, videoId))
    .returning();

  if (!updated) {
    throw new Error(`Video ${videoId} not found`);
  }

  return updated;
}

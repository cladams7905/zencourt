"use server";

import { db, videoContent } from "@db/client";
import type { DBVideoContent, InsertDBVideoContent } from "@shared/types/models";
import { eq } from "drizzle-orm";

/**
 * Create a new video content record
 */
export async function createVideoContent(
  video: InsertDBVideoContent
): Promise<void> {
  await db.insert(videoContent).values(video);
}

/**
 * Update an existing video content record
 */
export async function updateVideoContent(
  videoId: string,
  updates: Partial<Omit<InsertDBVideoContent, "id" | "contentId" | "createdAt">>
): Promise<DBVideoContent> {
  if (!videoId) {
    throw new Error("videoId is required");
  }

  const [updated] = await db
    .update(videoContent)
    .set({
      ...updates,
      updatedAt: new Date()
    })
    .where(eq(videoContent.id, videoId))
    .returning();

  if (!updated) {
    throw new Error(`Video content ${videoId} not found`);
  }

  return updated;
}

"use server";

import { db, videos } from "@db/client";
import type { InsertDBVideo } from "@shared/types/models";

/**
 * Create a new video record
 */
export async function createVideo(video: InsertDBVideo): Promise<void> {
  await db.insert(videos).values(video);
}

"use server";

import { db, desc, eq, userMedia } from "@db/client";
import type { DBUserMedia } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/models/shared/validation";

export async function getUserMedia(userId: string): Promise<DBUserMedia[]> {
  requireUserId(userId, "User ID is required to fetch media");

  return withDbErrorHandling(
    async () => {
      return db
        .select()
        .from(userMedia)
        .where(eq(userMedia.userId, userId))
        .orderBy(desc(userMedia.uploadedAt));
    },
    {
      actionName: "getUserMedia",
      context: { userId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

export async function getUserMediaById(
  userId: string,
  mediaId: string
): Promise<DBUserMedia | null> {
  requireUserId(userId, "User ID is required to fetch media");

  return withDbErrorHandling(
    async () => {
      const [row] = await db
        .select()
        .from(userMedia)
        .where(eq(userMedia.id, mediaId))
        .limit(1);
      if (!row || row.userId !== userId) {
        return null;
      }
      return row as DBUserMedia;
    },
    {
      actionName: "getUserMediaById",
      context: { userId, mediaId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

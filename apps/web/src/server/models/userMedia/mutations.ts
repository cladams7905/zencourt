"use server";

import { nanoid } from "nanoid";
import { and, db, eq, userMedia } from "@db/client";
import { userAdditional } from "@db/client";
import type { DBUserMedia } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireMediaId, requireUserId } from "@web/src/server/models/shared/validation";

type UserMediaDbRecordInput = {
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
};

export async function createUserMediaRecords(
  userId: string,
  uploads: UserMediaDbRecordInput[]
): Promise<DBUserMedia[]> {
  requireUserId(userId, "User ID is required to save media");

  if (!uploads || uploads.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      const now = new Date();
      const rows = uploads.map((upload) => ({
        id: nanoid(),
        userId,
        type: upload.type,
        url: upload.url,
        thumbnailUrl: upload.thumbnailUrl ?? null,
        usageCount: 0,
        uploadedAt: now
      }));

      const created = await db.insert(userMedia).values(rows).returning();
      await db
        .insert(userAdditional)
        .values({
          userId,
          mediaUploadedAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            mediaUploadedAt: now,
            updatedAt: now
          }
        });

      return created as DBUserMedia[];
    },
    {
      actionName: "createUserMediaRecords",
      context: { userId, uploadCount: uploads.length },
      errorMessage: "Failed to save media. Please try again."
    }
  );
}

export async function deleteUserMedia(
  userId: string,
  mediaId: string
): Promise<void> {
  requireUserId(userId, "User ID is required to delete media");
  requireMediaId(mediaId, "Media ID is required to delete media");

  return withDbErrorHandling(
    async () => {
      const [media] = await db
        .select()
        .from(userMedia)
        .where(and(eq(userMedia.id, mediaId), eq(userMedia.userId, userId)))
        .limit(1);

      if (!media) {
        throw new Error("Media not found");
      }

      await db
        .delete(userMedia)
        .where(and(eq(userMedia.id, mediaId), eq(userMedia.userId, userId)));
    },
    {
      actionName: "deleteUserMedia",
      context: { userId, mediaId },
      errorMessage: "Failed to delete media. Please try again."
    }
  );
}

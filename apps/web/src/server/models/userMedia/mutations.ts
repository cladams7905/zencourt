"use server";

import { and, db, eq, userMedia } from "@db/client";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { deleteStorageUrlsOrThrow } from "@web/src/server/models/shared/storageCleanup";
import { requireMediaId, requireUserId } from "@web/src/server/models/shared/validation";

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

      const urlsToDelete = [media.url, media.thumbnailUrl].filter(
        (url): url is string => Boolean(url)
      );
      await deleteStorageUrlsOrThrow(urlsToDelete, "Failed to delete media file");

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

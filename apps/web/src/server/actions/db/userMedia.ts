"use server";

import { db, userMedia, userAdditional, eq, and, desc } from "@db/client";
import type { DBUserMedia, InsertDBUserMedia } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import { nanoid } from "nanoid";

export async function getUserMedia(userId: string): Promise<DBUserMedia[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch media");
  }

  return withDbErrorHandling(
    async () => {
      const media = await db
        .select()
        .from(userMedia)
        .where(eq(userMedia.userId, userId))
        .orderBy(desc(userMedia.createdAt));

      return media;
    },
    {
      actionName: "getUserMedia",
      context: { userId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

export async function addUserMedia(
  userId: string,
  media: Omit<InsertDBUserMedia, "id" | "userId" | "createdAt" | "updatedAt">
): Promise<DBUserMedia> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to add media");
  }

  return withDbErrorHandling(
    async () => {
      const [newMedia] = await db
        .insert(userMedia)
        .values({
          id: nanoid(),
          userId,
          ...media,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      if (!newMedia) {
        throw new Error("Media could not be added");
      }

      // Mark mediaUploadedAt if this is the first media upload
      await db
        .insert(userAdditional)
        .values({
          userId,
          mediaUploadedAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            mediaUploadedAt: new Date(),
            updatedAt: new Date()
          }
        });

      return newMedia;
    },
    {
      actionName: "addUserMedia",
      context: { userId },
      errorMessage: "Failed to add media. Please try again."
    }
  );
}

export async function deleteUserMedia(
  userId: string,
  mediaId: string
): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete media");
  }

  if (!mediaId || mediaId.trim() === "") {
    throw new Error("Media ID is required to delete media");
  }

  return withDbErrorHandling(
    async () => {
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

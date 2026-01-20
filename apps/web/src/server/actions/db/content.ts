"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, content } from "@db/client";
import type { DBContent, InsertDBContent } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import {
  DEFAULT_THUMBNAIL_TTL_SECONDS,
  resolveSignedDownloadUrl
} from "../../utils/storageUrls";

type CreateContentInput = Omit<
  InsertDBContent,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

/**
 * Create new content for a listing
 */
export async function createContent(
  userId: string,
  payload: CreateContentInput
): Promise<DBContent> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create content");
  }
  const listingId = payload.listingId;
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to create content");
  }

  return withDbErrorHandling(
    async () => {
      const [newContent] = await db
        .insert(content)
        .values({
          ...payload,
          userId,
          id: payload.id ?? nanoid()
        })
        .returning();

      return {
        ...newContent,
        thumbnailUrl: await resolveSignedDownloadUrl(
          newContent.thumbnailUrl,
          DEFAULT_THUMBNAIL_TTL_SECONDS
        )
      };
    },
    {
      actionName: "createContent",
      context: { userId, listingId },
      errorMessage: "Failed to create content. Please try again."
    }
  );
}

/**
 * Update content by id
 */
export async function updateContent(
  userId: string,
  contentId: string,
  updates: Partial<Omit<InsertDBContent, "id" | "listingId" | "createdAt">>
): Promise<DBContent> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update content");
  }
  if (!contentId || contentId.trim() === "") {
    throw new Error("Content ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [updatedContent] = await db
        .update(content)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(content.id, contentId))
        .returning();

      if (!updatedContent) {
        throw new Error("Content not found");
      }

      return {
        ...updatedContent,
        thumbnailUrl: await resolveSignedDownloadUrl(
          updatedContent.thumbnailUrl,
          DEFAULT_THUMBNAIL_TTL_SECONDS
        )
      };
    },
    {
      actionName: "updateContent",
      context: { userId, contentId },
      errorMessage: "Failed to update content. Please try again."
    }
  );
}

/**
 * Fetch content for a listing
 */
export async function getContentByListingId(
  userId: string,
  listingId: string
): Promise<DBContent[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch content");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to fetch content");
  }

  return withDbErrorHandling(
    async () => {
      const contentRows = await db
        .select()
        .from(content)
        .where(eq(content.listingId, listingId));
      return Promise.all(
        contentRows.map(async (item) => ({
          ...item,
          thumbnailUrl: await resolveSignedDownloadUrl(
            item.thumbnailUrl,
            DEFAULT_THUMBNAIL_TTL_SECONDS
          )
        }))
      );
    },
    {
      actionName: "getContentByListingId",
      context: { userId, listingId },
      errorMessage: "Failed to load content. Please try again."
    }
  );
}

/**
 * Fetch a single content record by id
 */
export async function getContentById(
  userId: string,
  contentId: string
): Promise<DBContent | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch content");
  }
  if (!contentId || contentId.trim() === "") {
    throw new Error("Content ID is required");
  }

  return withDbErrorHandling(
    async () => {
      const [contentRecord] = await db
        .select()
        .from(content)
        .where(eq(content.id, contentId))
        .limit(1);
      if (!contentRecord) {
        return null;
      }
      return {
        ...contentRecord,
        thumbnailUrl: await resolveSignedDownloadUrl(
          contentRecord.thumbnailUrl,
          DEFAULT_THUMBNAIL_TTL_SECONDS
        )
      };
    },
    {
      actionName: "getContentById",
      context: { userId, contentId },
      errorMessage: "Failed to load content. Please try again."
    }
  );
}

/**
 * Delete content by id
 */
export async function deleteContent(
  userId: string,
  contentId: string
): Promise<void> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to delete content");
  }
  if (!contentId || contentId.trim() === "") {
    throw new Error("Content ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await db.delete(content).where(eq(content.id, contentId));
    },
    {
      actionName: "deleteContent",
      context: { userId, contentId },
      errorMessage: "Failed to delete content. Please try again."
    }
  );
}

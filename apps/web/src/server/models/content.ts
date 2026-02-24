"use server";

import { nanoid } from "nanoid";
import { and, db, content, eq } from "@db/client";
import type { DBContent, InsertDBContent } from "@db/types/models";
import { withDbErrorHandling } from "./shared/dbErrorHandling";
import {
  requireContentId,
  requireListingId,
  requireUserId
} from "./shared/validation";
import { resolvePublicDownloadUrl } from "../utils/storageUrls";

type CreateContentInput = Omit<
  InsertDBContent,
  "id" | "userId" | "createdAt" | "updatedAt"
> & { id?: string };

/**
 * Create new content for a listing
 */
export async function createContent(
  userId: string,
  payload: CreateContentInput
): Promise<DBContent> {
  requireUserId(userId, "User ID is required to create content");
  const listingId = payload.listingId;
  requireListingId(listingId ?? "", "Listing ID is required to create content");

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
        thumbnailUrl:
          resolvePublicDownloadUrl(newContent.thumbnailUrl) ??
          newContent.thumbnailUrl
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
  requireUserId(userId, "User ID is required to update content");
  requireContentId(contentId, "Content ID is required");

  return withDbErrorHandling(
    async () => {
      const [updatedContent] = await db
        .update(content)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(eq(content.id, contentId), eq(content.userId, userId)))
        .returning();

      if (!updatedContent) {
        throw new Error("Content not found");
      }

      return {
        ...updatedContent,
        thumbnailUrl:
          resolvePublicDownloadUrl(updatedContent.thumbnailUrl) ??
          updatedContent.thumbnailUrl
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
  requireUserId(userId, "User ID is required to fetch content");
  requireListingId(listingId, "Listing ID is required to fetch content");

  return withDbErrorHandling(
    async () => {
      const contentRows = await db
        .select()
        .from(content)
        .where(and(eq(content.listingId, listingId), eq(content.userId, userId)));
      return contentRows.map((item) => ({
        ...item,
        thumbnailUrl:
          resolvePublicDownloadUrl(item.thumbnailUrl) ?? item.thumbnailUrl
      }));
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
  requireUserId(userId, "User ID is required to fetch content");
  requireContentId(contentId, "Content ID is required");

  return withDbErrorHandling(
    async () => {
      const [contentRecord] = await db
        .select()
        .from(content)
        .where(and(eq(content.id, contentId), eq(content.userId, userId)))
        .limit(1);
      if (!contentRecord) {
        return null;
      }
      return {
        ...contentRecord,
        thumbnailUrl:
          resolvePublicDownloadUrl(contentRecord.thumbnailUrl) ??
          contentRecord.thumbnailUrl
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
  requireUserId(userId, "User ID is required to delete content");
  requireContentId(contentId, "Content ID is required");

  return withDbErrorHandling(
    async () => {
      await db
        .delete(content)
        .where(and(eq(content.id, contentId), eq(content.userId, userId)));
    },
    {
      actionName: "deleteContent",
      context: { userId, contentId },
      errorMessage: "Failed to delete content. Please try again."
    }
  );
}

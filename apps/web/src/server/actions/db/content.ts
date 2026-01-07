"use server";

import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, content } from "@db/client";
import type { DBContent, InsertDBContent } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import { ensurePublicUrlSafe } from "../../utils/storageUrls";

type CreateContentInput = Omit<
  InsertDBContent,
  "id" | "createdAt" | "updatedAt"
> & { id?: string };

const CONTENT_THUMBNAIL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

async function resolveThumbnailUrl(
  url?: string | null
): Promise<string | null> {
  if (!url) {
    return url ?? null;
  }
  const signed = await ensurePublicUrlSafe(url, CONTENT_THUMBNAIL_TTL_SECONDS);
  return signed ?? url ?? null;
}

/**
 * Create new content for a campaign
 */
export async function createContent(
  userId: string,
  payload: CreateContentInput
): Promise<DBContent> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create content");
  }
  const campaignId = payload.campaignId;
  if (!campaignId || campaignId.trim() === "") {
    throw new Error("Campaign ID is required to create content");
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
        thumbnailUrl: await resolveThumbnailUrl(newContent.thumbnailUrl)
      };
    },
    {
      actionName: "createContent",
      context: { userId, campaignId },
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
  updates: Partial<Omit<InsertDBContent, "id" | "campaignId" | "createdAt">>
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
        thumbnailUrl: await resolveThumbnailUrl(updatedContent.thumbnailUrl)
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
 * Fetch content for a campaign
 */
export async function getContentByCampaignId(
  userId: string,
  campaignId: string
): Promise<DBContent[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch content");
  }
  if (!campaignId || campaignId.trim() === "") {
    throw new Error("Campaign ID is required to fetch content");
  }

  return withDbErrorHandling(
    async () => {
      const contentRows = await db
        .select()
        .from(content)
        .where(eq(content.campaignId, campaignId));
      return Promise.all(
        contentRows.map(async (item) => ({
          ...item,
          thumbnailUrl: await resolveThumbnailUrl(item.thumbnailUrl)
        }))
      );
    },
    {
      actionName: "getContentByCampaignId",
      context: { userId, campaignId },
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
        thumbnailUrl: await resolveThumbnailUrl(contentRecord.thumbnailUrl)
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

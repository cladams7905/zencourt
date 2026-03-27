"use server";

import { and, content, db, eq } from "@db/client";
import type { DBContent } from "@db/types/models";
import { withDbErrorHandling } from "../shared/dbErrorHandling";
import { requireContentId, requireListingId, requireUserId } from "../shared/validation";

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
      return contentRows;
    },
    {
      actionName: "getContentByListingId",
      context: { userId, listingId },
      errorMessage: "Failed to load content. Please try again."
    }
  );
}

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

      return contentRecord;
    },
    {
      actionName: "getContentById",
      context: { userId, contentId },
      errorMessage: "Failed to load content. Please try again."
    }
  );
}

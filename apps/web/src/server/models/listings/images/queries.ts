"use server";

import { db, desc, eq, listingImages } from "@db/client";
import type { DBListingImage } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { ensureListingImageAccess } from "./helpers";

export async function getListingImages(
  userId: string,
  listingId: string
): Promise<DBListingImage[]> {
  return withDbErrorHandling(
    async () => {
      await ensureListingImageAccess(userId, listingId, {
        userIdError: "User ID is required to fetch listing images",
        listingIdError: "Listing ID is required to fetch listing images"
      });

      const images = (await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId))
        .orderBy(desc(listingImages.uploadedAt))) as DBListingImage[];
      return images;
    },
    {
      actionName: "getListingImages",
      context: { userId, listingId },
      errorMessage: "Failed to fetch listing images. Please try again."
    }
  );
}

export async function getListingImageUrlsByIds(
  userId: string,
  listingId: string,
  ids: string[]
): Promise<string[]> {
  if (ids.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      await ensureListingImageAccess(userId, listingId, {
        userIdError: "User ID is required to fetch listing images",
        listingIdError: "Listing ID is required to fetch listing images"
      });

      const rows = await db
        .select({ id: listingImages.id, url: listingImages.url })
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId));
      const idSet = new Set(ids);
      return rows.filter((row) => idSet.has(row.id)).map((row) => row.url);
    },
    {
      actionName: "getListingImageUrlsByIds",
      context: { userId, listingId, idsCount: ids.length },
      errorMessage: "Failed to fetch listing image urls. Please try again."
    }
  );
}

"use server";

import { db, desc, eq, listingImages } from "@db/client";
import type { DBListingImage } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/actions/shared/dbErrorHandling";
import { resolvePublicDownloadUrl } from "@web/src/server/utils/storageUrls";
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

      const images = await db
        .select()
        .from(listingImages)
        .where(eq(listingImages.listingId, listingId))
        .orderBy(desc(listingImages.uploadedAt));

      return images.map((row) => ({
        ...row,
        url: resolvePublicDownloadUrl(row.url) ?? row.url
      }));
    },
    {
      actionName: "getListingImages",
      context: { userId, listingId },
      errorMessage: "Failed to fetch listing images. Please try again."
    }
  );
}

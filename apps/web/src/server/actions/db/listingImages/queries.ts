"use server";

import { db, desc, eq, listingImages } from "@db/client";
import type { DBListingImage } from "@shared/types/models";
import { withDbErrorHandling } from "@web/src/server/actions/shared/dbErrorHandling";
import { mapWithSignedUrl } from "@web/src/server/actions/shared/urlSigning";
import {
  DEFAULT_THUMBNAIL_TTL_SECONDS,
  resolveSignedDownloadUrl
} from "@web/src/server/utils/storageUrls";
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

      return mapWithSignedUrl(
        images,
        (url) => resolveSignedDownloadUrl(url, DEFAULT_THUMBNAIL_TTL_SECONDS),
        { fallbackToOriginal: true }
      );
    },
    {
      actionName: "getListingImages",
      context: { userId, listingId },
      errorMessage: "Failed to fetch listing images. Please try again."
    }
  );
}

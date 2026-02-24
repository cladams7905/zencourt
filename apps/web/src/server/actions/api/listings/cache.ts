"use server";

import { ApiError } from "@web/src/server/utils/apiError";
import { StatusCode } from "@web/src/server/utils/apiResponses";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import { deleteCachedListingContentItem as deleteCachedListingContentItemService } from "@web/src/server/services/cache/listingContent";

const MEDIA_TYPE_IMAGE = "image" as const;

export type DeleteCachedListingContentItemParams = {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: string;
};

/**
 * Single entry point for "delete one cached listing content item".
 * Used by DELETE /api/v1/listings/[listingId]/content/cache/item.
 */
export async function deleteCachedListingContentItem(
  listingId: string,
  params: DeleteCachedListingContentItemParams
) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);

  const { cacheKeyTimestamp, cacheKeyId, subcategory: subcategoryRaw } = params;
  const subcategory = subcategoryRaw?.trim();
  if (
    typeof cacheKeyTimestamp !== "number" ||
    !Number.isFinite(cacheKeyTimestamp) ||
    cacheKeyTimestamp <= 0 ||
    typeof cacheKeyId !== "number" ||
    !Number.isFinite(cacheKeyId) ||
    cacheKeyId <= 0 ||
    !subcategory ||
    !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(subcategory)
  ) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message:
        "cacheKeyTimestamp, cacheKeyId, and valid subcategory are required"
    });
  }

  await deleteCachedListingContentItemService({
    userId: user.id,
    listingId,
    subcategory: subcategory as (typeof LISTING_CONTENT_SUBCATEGORIES)[number],
    mediaType: MEDIA_TYPE_IMAGE,
    timestamp: cacheKeyTimestamp,
    id: cacheKeyId
  });
}

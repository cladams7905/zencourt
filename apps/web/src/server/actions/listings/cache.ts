"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import {
  deleteCachedListingContentItem as deleteCachedListingContentItemService,
  updateCachedListingContentText as updateCachedListingContentTextService
} from "@web/src/server/infra/cache/listingContent/cache";
import { DomainValidationError } from "@web/src/server/errors/domain";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";

const MEDIA_TYPE_IMAGE = "image" as const;
const MEDIA_TYPE_VIDEO = "video" as const;

export type DeleteCachedListingContentItemParams = {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: string;
};

export type UpdateCachedListingVideoTextParams = {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: string;
  hook: string;
  caption: string;
  orderedClipIds: string[];
  clipDurationOverrides?: Record<string, number>;
};

export const deleteCachedListingContentItem = withServerActionCaller(
  "deleteCachedListingContentItem",
  async (listingId: string, params: DeleteCachedListingContentItemParams) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const {
      cacheKeyTimestamp,
      cacheKeyId,
      subcategory: subcategoryRaw
    } = params;
    const subcategory = subcategoryRaw?.trim();
    if (
      typeof cacheKeyTimestamp !== "number" ||
      !Number.isFinite(cacheKeyTimestamp) ||
      cacheKeyTimestamp <= 0 ||
      typeof cacheKeyId !== "number" ||
      !Number.isFinite(cacheKeyId) ||
      cacheKeyId < 0 ||
      !subcategory ||
      !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(
        subcategory
      )
    ) {
      throw new DomainValidationError(
        "cacheKeyTimestamp, cacheKeyId, and valid subcategory are required"
      );
    }

    await deleteCachedListingContentItemService({
      userId: user.id,
      listingId,
      subcategory:
        subcategory as (typeof LISTING_CONTENT_SUBCATEGORIES)[number],
      mediaType: MEDIA_TYPE_IMAGE,
      timestamp: cacheKeyTimestamp,
      id: cacheKeyId
    });
  }
);

export const updateCachedListingVideoText = withServerActionCaller(
  "updateCachedListingVideoText",
  async (listingId: string, params: UpdateCachedListingVideoTextParams) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const {
      cacheKeyTimestamp,
      cacheKeyId,
      subcategory: subcategoryRaw,
      hook: hookRaw,
      caption: captionRaw,
      orderedClipIds: orderedClipIdsRaw,
      clipDurationOverrides: clipDurationOverridesRaw
    } = params;
    const subcategory = subcategoryRaw?.trim();
    const hook = hookRaw?.trim();
    const caption = captionRaw?.trim();
    const orderedClipIds = Array.isArray(orderedClipIdsRaw)
      ? orderedClipIdsRaw
          .map((clipId) => (typeof clipId === "string" ? clipId.trim() : ""))
          .filter(Boolean)
      : [];
    const clipDurationOverrides =
      clipDurationOverridesRaw &&
      typeof clipDurationOverridesRaw === "object" &&
      !Array.isArray(clipDurationOverridesRaw)
        ? Object.fromEntries(
            Object.entries(clipDurationOverridesRaw)
              .map(
                ([clipId, duration]): [string, number | null] => [
                  clipId.trim(),
                  typeof duration === "number"
                    ? Number(duration.toFixed(2))
                    : null
                ]
              )
              .filter(
                (entry): entry is [string, number] =>
                  Boolean(entry[0]) && entry[1] !== null && entry[1] > 0
              )
          )
        : {};

    if (
      typeof cacheKeyTimestamp !== "number" ||
      !Number.isFinite(cacheKeyTimestamp) ||
      cacheKeyTimestamp <= 0 ||
      typeof cacheKeyId !== "number" ||
      !Number.isFinite(cacheKeyId) ||
      cacheKeyId < 0 ||
      !subcategory ||
      !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(
        subcategory
      ) ||
      !hook ||
      !caption ||
      orderedClipIds.length === 0
    ) {
      throw new DomainValidationError(
        "cacheKeyTimestamp, cacheKeyId, valid subcategory, hook, caption, and orderedClipIds are required"
      );
    }

    const updated = await updateCachedListingContentTextService({
      userId: user.id,
      listingId,
      subcategory:
        subcategory as (typeof LISTING_CONTENT_SUBCATEGORIES)[number],
      mediaType: MEDIA_TYPE_VIDEO,
      timestamp: cacheKeyTimestamp,
      id: cacheKeyId,
      hook,
      caption,
      orderedClipIds,
      clipDurationOverrides
    });

    if (!updated) {
      throw new DomainValidationError("Cached listing content item not found");
    }

    return updated;
  }
);

"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";
import {
  deleteCachedListingContentItem as deleteCachedListingContentItemService,
  updateCachedListingContentText as updateCachedListingContentTextService,
  updateCachedListingContentTimeline as updateCachedListingContentTimelineService
} from "@web/src/server/infra/cache/listingContent/cache";
import { DomainValidationError } from "@web/src/server/errors/domain";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";

const MEDIA_TYPE_IMAGE = "image" as const;
const MEDIA_TYPE_VIDEO = "video" as const;
type ListingSubcategory = (typeof LISTING_CONTENT_SUBCATEGORIES)[number];

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

export type UpdateCachedListingVideoTimelineParams = {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: string;
  orderedClipIds: string[];
  clipDurationOverrides?: Record<string, number>;
};

function isValidListingSubcategory(value: string): value is ListingSubcategory {
  return (LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(value);
}

function normalizeCacheTarget(params: {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  subcategory: string;
}) {
  const subcategory = params.subcategory?.trim();
  const hasValidTarget =
    typeof params.cacheKeyTimestamp === "number" &&
    Number.isFinite(params.cacheKeyTimestamp) &&
    params.cacheKeyTimestamp > 0 &&
    typeof params.cacheKeyId === "number" &&
    Number.isFinite(params.cacheKeyId) &&
    params.cacheKeyId >= 0 &&
    Boolean(subcategory) &&
    Boolean(subcategory && isValidListingSubcategory(subcategory));

  if (
    !hasValidTarget ||
    !subcategory ||
    !isValidListingSubcategory(subcategory)
  ) {
    throw new DomainValidationError(
      "cacheKeyTimestamp, cacheKeyId, and valid subcategory are required"
    );
  }

  return {
    cacheKeyTimestamp: params.cacheKeyTimestamp,
    cacheKeyId: params.cacheKeyId,
    subcategory
  };
}

function normalizeOrderedClipIds(orderedClipIdsRaw: unknown): string[] {
  if (!Array.isArray(orderedClipIdsRaw)) {
    return [];
  }

  return orderedClipIdsRaw
    .map((clipId) => (typeof clipId === "string" ? clipId.trim() : ""))
    .filter(Boolean);
}

function normalizeClipDurationOverrides(
  clipDurationOverridesRaw: unknown
): Record<string, number> {
  if (
    !clipDurationOverridesRaw ||
    typeof clipDurationOverridesRaw !== "object" ||
    Array.isArray(clipDurationOverridesRaw)
  ) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(clipDurationOverridesRaw)
      .map(([clipId, duration]): [string, number | null] => [
        clipId.trim(),
        typeof duration === "number" ? Number(duration.toFixed(2)) : null
      ])
      .filter(
        (entry): entry is [string, number] =>
          Boolean(entry[0]) && entry[1] !== null && entry[1] > 0
      )
  );
}

export const deleteCachedListingContentItem = withServerActionCaller(
  "deleteCachedListingContentItem",
  async (listingId: string, params: DeleteCachedListingContentItemParams) =>
    withCurrentUserListingAccess(listingId, async ({ user }) => {
      const { cacheKeyTimestamp, cacheKeyId, subcategory } =
        normalizeCacheTarget({
          cacheKeyTimestamp: params.cacheKeyTimestamp,
          cacheKeyId: params.cacheKeyId,
          subcategory: params.subcategory
        });

      await deleteCachedListingContentItemService({
        userId: user.id,
        listingId,
        subcategory,
        mediaType: MEDIA_TYPE_IMAGE,
        timestamp: cacheKeyTimestamp,
        id: cacheKeyId
      });
    })
);

export const updateCachedListingVideoText = withServerActionCaller(
  "updateCachedListingVideoText",
  async (listingId: string, params: UpdateCachedListingVideoTextParams) =>
    withCurrentUserListingAccess(listingId, async ({ user }) => {
      const { cacheKeyTimestamp, cacheKeyId, subcategory } =
        normalizeCacheTarget({
          cacheKeyTimestamp: params.cacheKeyTimestamp,
          cacheKeyId: params.cacheKeyId,
          subcategory: params.subcategory
        });
      const hook = params.hook?.trim();
      const caption = params.caption?.trim();
      const orderedClipIds = normalizeOrderedClipIds(params.orderedClipIds);
      const clipDurationOverrides = normalizeClipDurationOverrides(
        params.clipDurationOverrides
      );

      if (!hook || !caption || orderedClipIds.length === 0) {
        throw new DomainValidationError(
          "hook, caption, and orderedClipIds are required"
        );
      }

      const updated = await updateCachedListingContentTextService({
        userId: user.id,
        listingId,
        subcategory,
        mediaType: MEDIA_TYPE_VIDEO,
        timestamp: cacheKeyTimestamp,
        id: cacheKeyId,
        hook,
        caption,
        orderedClipIds,
        clipDurationOverrides
      });

      if (!updated) {
        throw new DomainValidationError(
          "Cached listing content item not found"
        );
      }

      return updated;
    })
);

export const updateCachedListingVideoTimeline = withServerActionCaller(
  "updateCachedListingVideoTimeline",
  async (listingId: string, params: UpdateCachedListingVideoTimelineParams) =>
    withCurrentUserListingAccess(listingId, async ({ user }) => {
      const { cacheKeyTimestamp, cacheKeyId, subcategory } =
        normalizeCacheTarget({
          cacheKeyTimestamp: params.cacheKeyTimestamp,
          cacheKeyId: params.cacheKeyId,
          subcategory: params.subcategory
        });
      const orderedClipIds = normalizeOrderedClipIds(params.orderedClipIds);
      const clipDurationOverrides = normalizeClipDurationOverrides(
        params.clipDurationOverrides
      );

      if (orderedClipIds.length === 0) {
        throw new DomainValidationError("orderedClipIds are required");
      }

      const updated = await updateCachedListingContentTimelineService({
        userId: user.id,
        listingId,
        subcategory,
        mediaType: MEDIA_TYPE_VIDEO,
        timestamp: cacheKeyTimestamp,
        id: cacheKeyId,
        orderedClipIds,
        clipDurationOverrides
      });

      if (!updated) {
        throw new DomainValidationError(
          "Cached listing content item not found"
        );
      }

      return updated;
    })
);

"use server";

import { getContentByListingId } from "@web/src/server/models/content";
import {
  getCachedListingContentForCreateFilter,
  type ListingCreateCachedContentItem,
  type ListingMediaType
} from "@web/src/server/infra/cache/listingContent/cache";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/lib/domain/listings/content/create";
import { isSavedListingReelMetadata } from "@web/src/lib/domain/listings/content/reels";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildSavedReelDedupKey,
  mapSavedReelContentToCreateItem
} from "../reels";

const MAX_LISTING_CREATE_PAGE_SIZE = LISTING_CREATE_INITIAL_PAGE_SIZE;

function normalizeListingCreatePageParams(params: {
  limit?: number;
  offset?: number;
}) {
  return {
    offset: Math.max(0, params.offset ?? 0),
    limit: Math.min(
      MAX_LISTING_CREATE_PAGE_SIZE,
      Math.max(1, params.limit ?? LISTING_CREATE_INITIAL_PAGE_SIZE)
    )
  };
}

function buildSavedCreatePageData(params: {
  savedContentRows: Awaited<ReturnType<typeof getContentByListingId>>;
  activeSubcategory: ListingContentSubcategory;
  activeMediaType: ListingMediaType;
}) {
  const staleCacheKeys = new Set<string>();
  const savedItems: ContentItem[] = [];

  for (const row of params.savedContentRows) {
    if (!isSavedListingReelMetadata(row.metadata)) {
      continue;
    }

    if (
      row.metadata.listingSubcategory !== params.activeSubcategory ||
      (row.contentType ?? "video") !== params.activeMediaType
    ) {
      continue;
    }

    const staleCacheKey = buildSavedReelDedupKey(row.metadata);
    if (staleCacheKey) {
      staleCacheKeys.add(staleCacheKey);
    }

    const savedItem = mapSavedReelContentToCreateItem(row);
    if (savedItem) {
      savedItems.push(savedItem);
    }
  }

  return {
    savedItems,
    staleCacheKeys
  };
}

export async function getListingContentItems(params: {
  userId: string;
  listingId: string;
  mediaTab?: ListingCreateMediaTab;
  subcategory?: ListingContentSubcategory;
  limit?: number;
  offset?: number;
  /** When set, skips an extra getContentByListingId (e.g. listing create view already loaded rows). */
  savedContentRows?: Awaited<ReturnType<typeof getContentByListingId>>;
  /**
   * When set (e.g. from getAllCachedListingContentForCreate), filters in memory for the active
   * subcategory/media tab instead of calling getCachedListingContentForCreateFilter (avoids a second Redis scan).
   */
  allCachedListingContentForCreate?: ListingCreateCachedContentItem[];
}) {
  const activeMediaType: ListingMediaType =
    params.mediaTab === "images" ? "image" : "video";
  const activeSubcategory: ListingContentSubcategory =
    params.subcategory ?? "new_listing";
  const [cachedListingContentItems, savedContentRows] = await Promise.all([
    params.allCachedListingContentForCreate !== undefined
      ? Promise.resolve(
          params.allCachedListingContentForCreate.filter(
            (item) =>
              item.listingSubcategory === activeSubcategory &&
              item.mediaType === activeMediaType
          )
        )
      : getCachedListingContentForCreateFilter({
          userId: params.userId,
          listingId: params.listingId,
          subcategory: activeSubcategory,
          mediaType: activeMediaType
        }),
    params.savedContentRows !== undefined
      ? Promise.resolve(params.savedContentRows)
      : getContentByListingId(params.userId, params.listingId)
  ]);
  const { savedItems, staleCacheKeys } = buildSavedCreatePageData({
    savedContentRows,
    activeSubcategory,
    activeMediaType
  });

  const allItems = [
    ...savedItems,
    ...cachedListingContentItems
      .filter(
        (item) =>
          !staleCacheKeys.has(`${item.cacheKeyTimestamp}:${item.cacheKeyId}`)
      )
      .map((item) => ({
        ...item,
        contentSource: "cached_create" as const
      }))
  ];
  const { offset, limit } = normalizeListingCreatePageParams(params);
  const items = allItems.slice(offset, offset + limit);
  const nextOffset = offset + items.length;

  return {
    items,
    hasMore: nextOffset < allItems.length,
    nextOffset
  };
}

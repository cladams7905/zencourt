import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import { getSharedRedisClient } from "../redis";
import type {
  ListingContentItem,
  ListingContentItemWithKey,
  ListingMediaType
} from "./types";

export type {
  ListingContentItem,
  ListingContentItemWithKey,
  ListingGeneratedItem,
  ListingMediaType
} from "./types";

const logger = createChildLogger(baseLogger, {
  module: "listing-content-cache"
});

export const LISTING_CONTENT_CACHE_PREFIX = "listing-content";
export const LISTING_CONTENT_CACHE_TTL_SECONDS = 60 * 60 * 12;
const LISTING_MEDIA_TYPES: readonly ListingMediaType[] = ["image", "video"];

export type ListingCreateCachedContentItem = {
  id: string;
  aspectRatio: "square";
  isFavorite: false;
  hook: string;
  caption: string | null;
  body: Array<{
    header: string;
    content: string;
    broll_query?: string | null;
  }> | null;
  brollQuery: string | null;
  listingSubcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  cacheKeyTimestamp: number;
  cacheKeyId: number;
  cachedRenderedPreview?: {
    imageUrl: string;
    templateId: string;
    modifications: Record<string, string>;
  };
};

function mapCachedListingItemToCreateContent(params: {
  item: ListingContentItemWithKey;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
}): ListingCreateCachedContentItem {
  const { item, subcategory, mediaType } = params;
  const mapped: ListingCreateCachedContentItem = {
    id: `cached-${subcategory}-${mediaType}-${item.cacheKeyTimestamp}-${item.cacheKeyId}`,
    aspectRatio: "square",
    isFavorite: false,
    hook: item.hook,
    caption: item.caption ?? null,
    body: item.body ?? null,
    brollQuery: item.broll_query ?? null,
    listingSubcategory: subcategory,
    mediaType,
    cacheKeyTimestamp: item.cacheKeyTimestamp,
    cacheKeyId: item.cacheKeyId
  };
  if (
    item.renderedImageUrl &&
    item.renderedTemplateId &&
    item.renderedModifications
  ) {
    mapped.cachedRenderedPreview = {
      imageUrl: item.renderedImageUrl,
      templateId: item.renderedTemplateId,
      modifications: item.renderedModifications
    };
  }
  return mapped;
}

/**
 * Key for a single item: listing-content:{userId}:{listingId}:{subcategory}:{mediaType}:{timestamp}:{id}
 */
export function buildListingContentItemKey(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
}): string {
  return [
    LISTING_CONTENT_CACHE_PREFIX,
    params.userId,
    params.listingId,
    params.subcategory,
    params.mediaType,
    String(params.timestamp),
    String(params.id)
  ].join(":");
}

/**
 * Prefix for SCAN to find all item keys for a filter. Match pattern: prefix + "*"
 */
export function getListingContentFilterPrefix(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
}): string {
  return [
    LISTING_CONTENT_CACHE_PREFIX,
    params.userId,
    params.listingId,
    params.subcategory,
    params.mediaType
  ].join(":");
}

/**
 * Writes one listing content item to its key. One key per item (timestamp:id).
 */
export async function setCachedListingContentItem(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
  item: ListingContentItem;
}): Promise<void> {
  const redis = getSharedRedisClient();
  if (!redis) return;
  const key = buildListingContentItemKey({
    userId: params.userId,
    listingId: params.listingId,
    subcategory: params.subcategory,
    mediaType: params.mediaType,
    timestamp: params.timestamp,
    id: params.id
  });
  try {
    await redis.set(key, params.item, {
      ex: LISTING_CONTENT_CACHE_TTL_SECONDS
    });
  } catch (error) {
    logger.warn(
      { error, cacheKey: key },
      "Failed writing listing content item cache"
    );
  }
}

/**
 * Returns all cached listing content items for a filter. SCANs keys by prefix, GETs each, sorts by timestamp then id.
 */
export async function getAllCachedListingContentForFilter(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
}): Promise<ListingContentItemWithKey[]> {
  const redis = getSharedRedisClient();
  if (!redis) return [];
  const prefix = getListingContentFilterPrefix(params);
  const match = `${prefix}:*`;
  const keys: string[] = [];
  let cursor = 0;
  try {
    do {
      const [nextCursor, batch] = await redis.scan(cursor, {
        match,
        count: 100
      });
      cursor =
        typeof nextCursor === "string" ? parseInt(nextCursor, 10) : nextCursor;
      keys.push(...(batch as string[]));
    } while (cursor !== 0);
  } catch (error) {
    logger.warn({ error, match }, "Failed scanning listing content cache keys");
    return [];
  }
  const entries: { timestamp: number; id: number; key: string }[] = [];
  for (const key of keys) {
    const parts = key.split(":");
    const timestampStr = parts[parts.length - 2];
    const idStr = parts[parts.length - 1];
    const timestamp = parseInt(timestampStr ?? "0", 10);
    const id = parseInt(idStr ?? "0", 10);
    if (Number.isNaN(timestamp) || Number.isNaN(id)) continue;
    entries.push({ timestamp, id, key });
  }
  entries.sort((a, b) => a.timestamp - b.timestamp || a.id - b.id);
  const result: ListingContentItemWithKey[] = [];
  for (const { key, timestamp, id } of entries) {
    try {
      const item = await redis.get<ListingContentItem>(key);
      if (item && typeof item === "object" && typeof item.hook === "string") {
        result.push({
          ...item,
          cacheKeyTimestamp: timestamp,
          cacheKeyId: id
        });
      }
    } catch (error) {
      logger.warn(
        { error, cacheKey: key },
        "Failed reading listing content item"
      );
    }
  }
  return result;
}

export async function getAllCachedListingContentForCreate(params: {
  userId: string;
  listingId: string;
}): Promise<ListingCreateCachedContentItem[]> {
  const { userId, listingId } = params;
  const groups = await Promise.all(
    LISTING_CONTENT_SUBCATEGORIES.flatMap((subcategory) =>
      LISTING_MEDIA_TYPES.map(async (mediaType) => {
        const items = await getAllCachedListingContentForFilter({
          userId,
          listingId,
          subcategory,
          mediaType
        });
        return items.map((item) =>
          mapCachedListingItemToCreateContent({ item, subcategory, mediaType })
        );
      })
    )
  );
  return groups.flat();
}

/**
 * Returns one cached listing content item by its key (timestamp + id). Null if missing or invalid.
 */
export async function getCachedListingContentItem(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
}): Promise<ListingContentItem | null> {
  const redis = getSharedRedisClient();
  if (!redis) return null;
  const key = buildListingContentItemKey(params);
  try {
    const item = await redis.get<ListingContentItem>(key);
    if (item && typeof item === "object" && typeof item.hook === "string") {
      return item;
    }
  } catch (error) {
    logger.warn(
      { error, cacheKey: key },
      "Failed reading listing content item"
    );
  }
  return null;
}

/**
 * Updates the rendered preview fields for one cached item.
 */
export async function updateRenderedPreviewForItem(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
  imageUrl: string;
  templateId: string;
  modifications: Record<string, string>;
}): Promise<void> {
  const redis = getSharedRedisClient();
  if (!redis) return;
  const key = buildListingContentItemKey({
    userId: params.userId,
    listingId: params.listingId,
    subcategory: params.subcategory,
    mediaType: params.mediaType,
    timestamp: params.timestamp,
    id: params.id
  });
  try {
    const existing = await redis.get<ListingContentItem>(key);
    if (!existing || typeof existing !== "object") return;
    const updated: ListingContentItem = {
      ...existing,
      renderedImageUrl: params.imageUrl,
      renderedTemplateId: params.templateId,
      renderedModifications: params.modifications
    };
    await redis.set(key, updated, {
      ex: LISTING_CONTENT_CACHE_TTL_SECONDS
    });
  } catch (error) {
    logger.warn(
      { error, cacheKey: key },
      "Failed updating listing content item render"
    );
  }
}

/**
 * Deletes one cached listing content item by its key. No-op if Redis is unavailable.
 */
export async function deleteCachedListingContentItem(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
}): Promise<void> {
  const redis = getSharedRedisClient();
  if (!redis) return;
  const key = buildListingContentItemKey({
    userId: params.userId,
    listingId: params.listingId,
    subcategory: params.subcategory,
    mediaType: params.mediaType,
    timestamp: params.timestamp,
    id: params.id
  });
  try {
    await redis.del(key);
  } catch (error) {
    logger.warn(
      { error, cacheKey: key },
      "Failed deleting listing content item cache"
    );
  }
}

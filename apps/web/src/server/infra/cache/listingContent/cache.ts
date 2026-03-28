import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import { normalizeErrorForLogging } from "@shared/utils/errors";
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
export const LISTING_CONTENT_CACHE_TTL_SECONDS = 60 * 60 * 48;
const LISTING_MEDIA_TYPES: readonly ListingMediaType[] = ["image", "video"];

const LISTING_SUBCATEGORY_INDEX = new Map(
  LISTING_CONTENT_SUBCATEGORIES.map((s, i) => [s, i] as const)
);

function mediaTypeSortIndex(mediaType: ListingMediaType): number {
  return mediaType === "image" ? 0 : 1;
}

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
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
  overlayBackground?: ListingContentItem["overlayBackground"] | null;
  overlayPosition?: ListingContentItem["overlayPosition"] | null;
  overlayFontPairing?: ListingContentItem["overlayFontPairing"] | null;
  showAddress?: boolean | null;
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
    cacheKeyId: item.cacheKeyId,
    overlayBackground: item.overlayBackground ?? null,
    overlayPosition: item.overlayPosition ?? null,
    overlayFontPairing: item.overlayFontPairing ?? null,
    showAddress: item.showAddress ?? null,
    orderedClipIds: item.orderedClipIds ?? null,
    clipDurationOverrides: item.clipDurationOverrides ?? null
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

const LISTING_SUBCATEGORY_SET = new Set<string>(LISTING_CONTENT_SUBCATEGORIES);

/**
 * SCAN match for all item keys under one listing: listing-content:{userId}:{listingId}:*
 */
export function getListingContentListingScanMatch(params: {
  userId: string;
  listingId: string;
}): string {
  return [
    LISTING_CONTENT_CACHE_PREFIX,
    params.userId,
    params.listingId,
    "*"
  ].join(":");
}

/**
 * Parses a cache key built by {@link buildListingContentItemKey}. Returns null if the key is malformed
 * or uses an unknown subcategory or media type.
 */
export function parseListingContentItemKey(key: string): {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
} | null {
  const parts = key.split(":");
  if (parts.length !== 7) return null;
  if (parts[0] !== LISTING_CONTENT_CACHE_PREFIX) return null;
  const [, userId, listingId, subRaw, mediaRaw, tsRaw, idRaw] = parts;
  if (!userId || !listingId || !subRaw || !mediaRaw || !tsRaw || !idRaw) {
    return null;
  }
  if (!LISTING_SUBCATEGORY_SET.has(subRaw)) return null;
  if (!LISTING_MEDIA_TYPES.includes(mediaRaw as ListingMediaType)) return null;
  const timestamp = parseInt(tsRaw, 10);
  const id = parseInt(idRaw, 10);
  if (Number.isNaN(timestamp) || Number.isNaN(id)) return null;
  return {
    userId,
    listingId,
    subcategory: subRaw as ListingContentSubcategory,
    mediaType: mediaRaw as ListingMediaType,
    timestamp,
    id
  };
}

type CachedListingContentRow = {
  key: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  item: ListingContentItemWithKey;
};

/**
 * Sort for create view: same order as iterating LISTING_CONTENT_SUBCATEGORIES × LISTING_MEDIA_TYPES,
 * with timestamp then id within each (subcategory, mediaType) bucket — not a single global timestamp sort.
 */
function compareRowsForCreateSort(
  a: CachedListingContentRow,
  b: CachedListingContentRow
): number {
  const ai = LISTING_SUBCATEGORY_INDEX.get(a.subcategory) ?? 999;
  const bi = LISTING_SUBCATEGORY_INDEX.get(b.subcategory) ?? 999;
  if (ai !== bi) return ai - bi;
  const am = mediaTypeSortIndex(a.mediaType);
  const bm = mediaTypeSortIndex(b.mediaType);
  if (am !== bm) return am - bm;
  if (a.item.cacheKeyTimestamp !== b.item.cacheKeyTimestamp) {
    return a.item.cacheKeyTimestamp - b.item.cacheKeyTimestamp;
  }
  return a.item.cacheKeyId - b.item.cacheKeyId;
}

async function scanKeysForMatch(params: {
  redis: NonNullable<ReturnType<typeof getSharedRedisClient>>;
  match: string;
}): Promise<string[]> {
  const { redis, match } = params;
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
    logger.warn(
      { err: normalizeErrorForLogging(error), match },
      "Failed scanning listing content cache keys"
    );
    return [];
  }
  return keys;
}

async function loadAllCachedListingContentRowsForListing(params: {
  userId: string;
  listingId: string;
}): Promise<CachedListingContentRow[]> {
  const redis = getSharedRedisClient();
  if (!redis) return [];
  const match = getListingContentListingScanMatch(params);
  const keys = await scanKeysForMatch({ redis, match });
  const rows: CachedListingContentRow[] = [];
  for (const key of keys) {
    const parsed = parseListingContentItemKey(key);
    if (!parsed) continue;
    if (
      parsed.userId !== params.userId ||
      parsed.listingId !== params.listingId
    ) {
      continue;
    }
    try {
      const item = await redis.get<ListingContentItem>(key);
      if (item && typeof item === "object" && typeof item.hook === "string") {
        rows.push({
          key,
          subcategory: parsed.subcategory,
          mediaType: parsed.mediaType,
          item: {
            ...item,
            cacheKeyTimestamp: parsed.timestamp,
            cacheKeyId: parsed.id
          }
        });
      }
    } catch (error) {
      logger.warn(
        { err: normalizeErrorForLogging(error), cacheKey: key },
        "Failed reading listing content item"
      );
    }
  }
  return rows;
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
      { err: normalizeErrorForLogging(error), cacheKey: key },
      "Failed writing listing content item cache"
    );
  }
}

/**
 * Returns all cached listing content items for a filter. One listing-wide SCAN, then in-memory filter;
 * sorts by timestamp then id within that subcategory/media pair.
 */
export async function getAllCachedListingContentForFilter(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
}): Promise<ListingContentItemWithKey[]> {
  const rows = await loadAllCachedListingContentRowsForListing({
    userId: params.userId,
    listingId: params.listingId
  });
  const filtered = rows.filter(
    (r) =>
      r.subcategory === params.subcategory && r.mediaType === params.mediaType
  );
  filtered.sort(
    (a, b) =>
      a.item.cacheKeyTimestamp - b.item.cacheKeyTimestamp ||
      a.item.cacheKeyId - b.item.cacheKeyId
  );
  return filtered.map((r) => r.item);
}

export async function getAllCachedListingContentForCreate(params: {
  userId: string;
  listingId: string;
}): Promise<ListingCreateCachedContentItem[]> {
  const rows = await loadAllCachedListingContentRowsForListing(params);
  rows.sort(compareRowsForCreateSort);
  return rows.map((r) =>
    mapCachedListingItemToCreateContent({
      item: r.item,
      subcategory: r.subcategory,
      mediaType: r.mediaType
    })
  );
}

export async function getCachedListingContentForCreateFilter(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
}): Promise<ListingCreateCachedContentItem[]> {
  const { userId, listingId, subcategory, mediaType } = params;
  const items = await getAllCachedListingContentForFilter({
    userId,
    listingId,
    subcategory,
    mediaType
  });

  return items.map((item) =>
    mapCachedListingItemToCreateContent({ item, subcategory, mediaType })
  );
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
      { err: normalizeErrorForLogging(error), cacheKey: key },
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
      { err: normalizeErrorForLogging(error), cacheKey: key },
      "Failed updating listing content item render"
    );
  }
}

/**
 * Updates the top-level hook and caption fields for one cached item.
 * Returns the updated item, or null when the cache entry does not exist.
 */
export async function updateCachedListingContentText(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
  hook: string;
  caption: string;
  overlayBackground?: ListingContentItem["overlayBackground"] | null;
  overlayPosition?: ListingContentItem["overlayPosition"] | null;
  overlayFontPairing?: ListingContentItem["overlayFontPairing"] | null;
  showAddress?: boolean | null;
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
}): Promise<ListingContentItem | null> {
  const redis = getSharedRedisClient();
  if (!redis) return null;
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
    if (!existing || typeof existing !== "object") {
      return null;
    }

    const updated: ListingContentItem = {
      ...existing,
      hook: params.hook,
      caption: params.caption,
      overlayBackground: params.overlayBackground ?? null,
      overlayPosition: params.overlayPosition ?? null,
      overlayFontPairing: params.overlayFontPairing ?? null,
      showAddress: params.showAddress ?? null,
      orderedClipIds: params.orderedClipIds ?? null,
      clipDurationOverrides: params.clipDurationOverrides ?? null
    };

    await redis.set(key, updated, {
      ex: LISTING_CONTENT_CACHE_TTL_SECONDS
    });

    return updated;
  } catch (error) {
    logger.warn(
      { err: normalizeErrorForLogging(error), cacheKey: key },
      "Failed updating listing content item text"
    );
    return null;
  }
}

/**
 * Updates the clip timeline state for one cached video item.
 * Returns the updated item, or null when the cache entry does not exist.
 */
export async function updateCachedListingContentTimeline(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  timestamp: number;
  id: number;
  orderedClipIds: string[];
  clipDurationOverrides?: Record<string, number> | null;
}): Promise<ListingContentItem | null> {
  const redis = getSharedRedisClient();
  if (!redis) return null;
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
    if (!existing || typeof existing !== "object") {
      return null;
    }

    const updated: ListingContentItem = {
      ...existing,
      orderedClipIds: params.orderedClipIds,
      clipDurationOverrides: params.clipDurationOverrides ?? null
    };

    await redis.set(key, updated, {
      ex: LISTING_CONTENT_CACHE_TTL_SECONDS
    });

    return updated;
  } catch (error) {
    logger.warn(
      { err: normalizeErrorForLogging(error), cacheKey: key },
      "Failed updating listing content item timeline"
    );
    return null;
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
      { err: normalizeErrorForLogging(error), cacheKey: key },
      "Failed deleting listing content item cache"
    );
  }
}

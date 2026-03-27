import type { DBContent } from "@db/types/models";
import { getContentByListingId } from "@web/src/server/models/content";
import {
  getAllCachedListingContentForCreate,
  type ListingCreateCachedContentItem
} from "@web/src/server/infra/cache/listingContent/cache";
import { isSavedListingReelMetadata } from "@web/src/lib/domain/listings/content/reels";

/**
 * UUIDs of user_media rows referenced by reel sequences for this listing,
 * from persisted DB reels and unsaved Redis-cached create drafts.
 */
export function collectReelReferencedUserMediaIdsFromSnapshot(
  savedRows: DBContent[],
  cachedItems: ListingCreateCachedContentItem[]
): string[] {
  const ids = new Set<string>();

  for (const row of savedRows) {
    if (!isSavedListingReelMetadata(row.metadata)) {
      continue;
    }
    for (const step of row.metadata.sequence) {
      if (step.sourceType === "user_media" && step.sourceId) {
        ids.add(step.sourceId);
      }
    }
  }

  const prefix = "user-media:";
  for (const item of cachedItems) {
    const ordered = item.orderedClipIds;
    if (!ordered?.length) {
      continue;
    }
    for (const key of ordered) {
      if (typeof key !== "string" || !key.startsWith(prefix)) {
        continue;
      }
      const id = key.slice(prefix.length).trim();
      if (id) {
        ids.add(id);
      }
    }
  }

  return Array.from(ids);
}

/**
 * Loads saved content and full create cache, then collects referenced user media ids.
 * Prefer `collectReelReferencedUserMediaIdsFromSnapshot` when those are already loaded.
 */
export async function collectReelReferencedUserMediaIds(
  userId: string,
  listingId: string
): Promise<string[]> {
  const [savedRows, cachedItems] = await Promise.all([
    getContentByListingId(userId, listingId),
    getAllCachedListingContentForCreate({ userId, listingId })
  ]);
  return collectReelReferencedUserMediaIdsFromSnapshot(savedRows, cachedItems);
}

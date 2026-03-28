import type { ListingContentSubcategory } from "@shared/types/models";
import type { ReelSequenceItem } from "./index";

export type SavedListingReelMetadata = {
  source: "listing_reel";
  version: 1;
  listingSubcategory: ListingContentSubcategory;
  hook: string;
  caption: string | null;
  brollQuery: string | null;
  sequence: ReelSequenceItem[];
  originCacheKeyTimestamp?: number;
  originCacheKeyId?: number;
};

export function isSavedListingReelMetadata(
  value: unknown
): value is SavedListingReelMetadata {
  if (!value || typeof value !== "object") {
    return false;
  }

  const metadata = value as Partial<SavedListingReelMetadata>;
  return (
    metadata.source === "listing_reel" &&
    metadata.version === 1 &&
    typeof metadata.listingSubcategory === "string" &&
    typeof metadata.hook === "string" &&
    Array.isArray(metadata.sequence)
  );
}

export function buildReelSourceKey(
  sourceType: ReelSequenceItem["sourceType"],
  sourceId: string
): string {
  return sourceType === "user_media" ? `user-media:${sourceId}` : sourceId;
}

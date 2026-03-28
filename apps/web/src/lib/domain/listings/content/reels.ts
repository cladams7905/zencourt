import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  OverlayFontPairing,
  PreviewTextOverlayBackground,
  PreviewTextOverlayPosition
} from "@shared/types/video";
import type { ReelSequenceItem } from "./index";

export type SavedListingReelMetadata = {
  source: "listing_reel";
  version: 1;
  listingSubcategory: ListingContentSubcategory;
  hook: string;
  caption: string | null;
  brollQuery: string | null;
  overlayBackground?: PreviewTextOverlayBackground | null;
  overlayPosition?: PreviewTextOverlayPosition | null;
  overlayFontPairing?: OverlayFontPairing | null;
  showAddress?: boolean | null;
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
    (metadata.overlayBackground === undefined ||
      metadata.overlayBackground === null ||
      typeof metadata.overlayBackground === "string") &&
    (metadata.overlayPosition === undefined ||
      metadata.overlayPosition === null ||
      typeof metadata.overlayPosition === "string") &&
    (metadata.overlayFontPairing === undefined ||
      metadata.overlayFontPairing === null ||
      typeof metadata.overlayFontPairing === "string") &&
    (metadata.showAddress === undefined ||
      metadata.showAddress === null ||
      typeof metadata.showAddress === "boolean") &&
    Array.isArray(metadata.sequence)
  );
}

export function buildReelSourceKey(
  sourceType: ReelSequenceItem["sourceType"],
  sourceId: string
): string {
  return sourceType === "user_media" ? `user-media:${sourceId}` : sourceId;
}

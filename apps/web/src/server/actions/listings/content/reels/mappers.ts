import type { DashboardContentItem as ContentItem } from "@web/src/components/dashboard/shared/types";
import {
  buildReelSourceKey,
  isSavedListingReelMetadata
} from "@web/src/components/listings/create/shared/reels";
import type { SavedListingReelMetadata } from "@web/src/components/listings/create/shared/reels";
import type { DBContent, DBUserMedia } from "@db/types/models";

export function mapSavedReelContentToCreateItem(
  contentRow: DBContent
): ContentItem | null {
  if (
    contentRow.contentType !== "video" ||
    !isSavedListingReelMetadata(contentRow.metadata)
  ) {
    return null;
  }

  const metadata = contentRow.metadata;
  return {
    id: `saved-${contentRow.id}`,
    aspectRatio: "square",
    isFavorite: contentRow.isFavorite,
    hook: metadata.hook,
    caption: metadata.caption ?? null,
    body: metadata.body ?? null,
    brollQuery: metadata.brollQuery ?? null,
    listingSubcategory: metadata.listingSubcategory,
    mediaType: "video",
    contentSource: "saved_content",
    savedContentId: contentRow.id,
    reelSequence: metadata.sequence
  };
}

export function buildSavedReelDedupKey(
  metadata: SavedListingReelMetadata
): string | null {
  if (
    typeof metadata.originCacheKeyTimestamp !== "number" ||
    typeof metadata.originCacheKeyId !== "number"
  ) {
    return null;
  }

  return `${metadata.originCacheKeyTimestamp}:${metadata.originCacheKeyId}`;
}

export function mapUserMediaToVideoItem(media: DBUserMedia): ContentItem | null {
  if (media.type !== "video") {
    return null;
  }

  return {
    id: buildReelSourceKey("user_media", media.id),
    thumbnail: media.thumbnailUrl ?? undefined,
    videoUrl: media.url,
    durationSeconds: media.durationSeconds ?? 3,
    aspectRatio: "vertical",
    alt: "User media clip",
    category: "user media",
    reelClipSource: "user_media"
  };
}

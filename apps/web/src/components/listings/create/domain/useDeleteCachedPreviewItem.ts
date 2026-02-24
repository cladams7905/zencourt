import * as React from "react";
import { deleteCachedListingContentItem } from "@web/src/server/actions/listings/commands";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";

type CachedContentItem = ContentItem & {
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

export function useDeleteCachedPreviewItem(params: {
  listingId: string;
  activeSubcategory: ListingContentSubcategory;
  activeMediaItems: ContentItem[];
  removeContentItem: (contentItemId: string) => void;
}) {
  const { listingId, activeSubcategory, activeMediaItems, removeContentItem } = params;

  return React.useCallback(
    async (contentItemId: string) => {
      const contentItem = activeMediaItems.find((item) => item.id === contentItemId) as
        | CachedContentItem
        | undefined;
      if (
        contentItem &&
        typeof contentItem.cacheKeyTimestamp === "number" &&
        typeof contentItem.cacheKeyId === "number"
      ) {
        try {
          await deleteCachedListingContentItem(listingId, {
            cacheKeyTimestamp: contentItem.cacheKeyTimestamp,
            cacheKeyId: contentItem.cacheKeyId,
            subcategory: activeSubcategory
          });
        } catch {
          // Keep optimistic UI behavior even when cache cleanup fails.
        }
      }
      removeContentItem(contentItemId);
    },
    [activeMediaItems, activeSubcategory, listingId, removeContentItem]
  );
}

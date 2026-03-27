import * as React from "react";
import { deleteCachedListingContentItem } from "@web/src/server/actions/listings/content/cache";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";

type CachedContentItem = ContentItem & {
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

export function useDeleteCachedPreviewItem(params: {
  listingId: string;
  activeSubcategory: ListingContentSubcategory;
  activeContentItems: ContentItem[];
  removeContentItem: (contentItemId: string) => void;
}) {
  const { listingId, activeSubcategory, activeContentItems, removeContentItem } = params;

  return React.useCallback(
    async (contentItemId: string) => {
      const contentItem = activeContentItems.find((item) => item.id === contentItemId) as
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
    [activeContentItems, activeSubcategory, listingId, removeContentItem]
  );
}

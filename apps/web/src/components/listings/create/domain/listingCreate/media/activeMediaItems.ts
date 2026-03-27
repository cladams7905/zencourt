import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { resolveContentMediaType } from "../shared/utils";

export function useListingCreateActiveMediaItems(params: {
  activeMediaTab: "videos" | "images";
  activeSubcategory: ListingContentSubcategory;
  bucketContentItems: ContentItem[];
}) {
  const { activeMediaTab, activeSubcategory, bucketContentItems } = params;

  return React.useMemo(
    () =>
      bucketContentItems.filter(
        (item) =>
          item.listingSubcategory === activeSubcategory &&
          resolveContentMediaType(item) === (activeMediaTab === "videos" ? "video" : "image")
      ),
    [activeMediaTab, activeSubcategory, bucketContentItems]
  );
}

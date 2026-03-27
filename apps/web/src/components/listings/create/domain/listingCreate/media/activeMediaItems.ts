import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
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

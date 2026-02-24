import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import { resolveContentMediaType } from "@web/src/components/listings/create/domain/listingCreateUtils";
import type { ListingContentSubcategory } from "@shared/types/models";

export function useListingCreateActiveMediaItems(params: {
  activeMediaTab: "videos" | "images";
  activeSubcategory: ListingContentSubcategory;
  localPostItems: ContentItem[];
}) {
  const { activeMediaTab, activeSubcategory, localPostItems } = params;

  return React.useMemo(
    () =>
      localPostItems.filter(
        (item) =>
          item.listingSubcategory === activeSubcategory &&
          resolveContentMediaType(item) === (activeMediaTab === "videos" ? "video" : "image")
      ),
    [activeMediaTab, activeSubcategory, localPostItems]
  );
}

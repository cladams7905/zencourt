import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import { resolveContentMediaType } from "../shared/utils";

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

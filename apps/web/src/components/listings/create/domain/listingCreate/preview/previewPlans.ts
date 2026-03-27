import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildListingCreatePreviewPlans,
  type PreviewPlanCaptionItem,
  type PreviewPlanVideoItem
} from "@web/src/lib/domain/listing/createPreviewPlans";

export { buildListingCreatePreviewPlans } from "@web/src/lib/domain/listing/createPreviewPlans";

export function useListingCreatePreviewPlans(params: {
  listingId: string;
  activeMediaTab: "videos" | "images";
  activeSubcategory: ListingContentSubcategory;
  activeMediaItems: PreviewPlanCaptionItem[];
  videoItems: PreviewPlanVideoItem[];
}) {
  const { listingId, activeMediaTab, activeSubcategory, activeMediaItems, videoItems } = params;

  return React.useMemo(() => {
    return buildListingCreatePreviewPlans({
      listingId,
      activeMediaTab,
      activeSubcategory,
      activeMediaItems,
      videoItems
    });
  }, [activeMediaItems, activeMediaTab, activeSubcategory, listingId, videoItems]);
}

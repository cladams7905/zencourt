import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildListingContentPreviewPlans,
  type PreviewPlanCaptionItem,
  type PreviewPlanClipItem
} from "@web/src/lib/domain/listings/content/createPreviewPlans";

export { buildListingContentPreviewPlans } from "@web/src/lib/domain/listings/content/createPreviewPlans";

export function useListingContentPreviewPlans(params: {
  listingId: string;
  activeMediaTab: "videos" | "images";
  activeSubcategory: ListingContentSubcategory;
  activeContentItems: PreviewPlanCaptionItem[];
  listingClipItems: PreviewPlanClipItem[];
}) {
  const {
    listingId,
    activeMediaTab,
    activeSubcategory,
    activeContentItems,
    listingClipItems
  } = params;

  return React.useMemo(() => {
    return buildListingContentPreviewPlans({
      listingId,
      activeMediaTab,
      activeSubcategory,
      activeContentItems,
      listingClipItems
    });
  }, [
    activeContentItems,
    activeMediaTab,
    activeSubcategory,
    listingId,
    listingClipItems
  ]);
}

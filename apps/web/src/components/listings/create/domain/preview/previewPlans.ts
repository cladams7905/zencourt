import * as React from "react";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildListingCreatePreviewPlans,
  type PreviewPlanCaptionItem,
  type PreviewPlanClipItem
} from "@web/src/lib/domain/listings/createPreviewPlans";

export { buildListingCreatePreviewPlans } from "@web/src/lib/domain/listings/createPreviewPlans";

export function useListingCreatePreviewPlans(params: {
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
    return buildListingCreatePreviewPlans({
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

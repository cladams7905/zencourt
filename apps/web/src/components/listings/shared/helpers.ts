import {
  LISTING_STAGE_LABELS,
  LISTING_STAGE_ORDER
} from "@web/src/components/listings/shared/constants";
import type {
  ListingStage,
  ListingStageStep
} from "@web/src/components/listings/shared/types";

export function buildListingStageSteps(
  currentStage: ListingStage
): ListingStageStep[] {
  const activeIndex = LISTING_STAGE_ORDER.indexOf(currentStage);

  return LISTING_STAGE_ORDER.map((stage, index) => ({
    label: LISTING_STAGE_LABELS[stage],
    active: index === activeIndex,
    completed: activeIndex > index
  }));
}

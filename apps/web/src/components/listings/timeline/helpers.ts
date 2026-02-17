import {
  LISTING_TIMELINE_LABELS,
  LISTING_TIMELINE_ORDER
} from "@web/src/components/listings/timeline/constants";
import type {
  ListingTimelineStage,
  ListingTimelineStep
} from "@web/src/components/listings/timeline/types";

export function buildListingTimelineSteps(
  currentStage: ListingTimelineStage
): ListingTimelineStep[] {
  const activeIndex = LISTING_TIMELINE_ORDER.indexOf(currentStage);

  return LISTING_TIMELINE_ORDER.map((stage, index) => ({
    label: LISTING_TIMELINE_LABELS[stage],
    active: index === activeIndex,
    completed: activeIndex > index
  }));
}

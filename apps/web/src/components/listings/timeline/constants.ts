import type { ListingTimelineStage } from "@web/src/components/listings/timeline/types";

export const LISTING_TIMELINE_ORDER: ListingTimelineStage[] = [
  "categorize",
  "review",
  "create"
];

export const LISTING_TIMELINE_LABELS: Record<ListingTimelineStage, string> = {
  categorize: "Categorize",
  review: "Review",
  create: "Create",
  generate: "Generate"
};

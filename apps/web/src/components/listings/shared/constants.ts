import type { ListingStage } from "@web/src/components/listings/shared/types";

export const LISTING_STAGE_ORDER: ListingStage[] = [
  "categorize",
  "review",
  "create"
];

export const LISTING_STAGE_LABELS: Record<ListingStage, string> = {
  categorize: "Categorize",
  review: "Review",
  create: "Create",
  generate: "Generate"
};

import type { ListingStage } from "@web/src/components/listings/stage/shared/domain/types";

export const LISTING_STAGE_ORDER: ListingStage[] = [
  "upload",
  "categorize",
  "review",
  "complete"
];

export const LISTING_STAGE_LABELS: Record<ListingStage, string> = {
  upload: "Upload",
  categorize: "Categorize",
  review: "Review",
  complete: "Complete",
  generate: "Generate"
};

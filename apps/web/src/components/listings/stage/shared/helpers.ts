import {
  LISTING_STAGE_LABELS,
  LISTING_STAGE_ORDER
} from "@web/src/components/listings/stage/shared/constants";
import type {
  ListingStage,
  ListingStageStep
} from "@web/src/components/listings/stage/shared/types";

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

export function resolveListingPath(input: {
  id: string;
  listingStage: string | null;
}): string {
  switch (input.listingStage) {
    case "review":
      return `/listings/${input.id}/stage/review`;
    case "generate":
      return `/listings/${input.id}/stage/generate`;
    case "create":
      return `/listings/${input.id}/content`;
    case "categorize":
    default:
      return `/listings/${input.id}/stage/categorize`;
  }
}

export function formatListingStageLabel(stage?: string | null): string {
  if (!stage) {
    return "Draft";
  }
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

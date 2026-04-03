import {
  LISTING_STAGE_LABELS,
  LISTING_STAGE_ORDER
} from "@web/src/components/listings/stage/shared/domain/constants";
import type {
  ListingStage,
  ListingStageStep
} from "@web/src/components/listings/stage/shared/domain/types";

const LISTING_STAGE_ACCESS_ORDER: ListingStage[] = [
  "upload",
  "plan",
  "review",
  "generate",
  "complete"
];

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

export function resolveListingResumePath(input: {
  id: string;
  listingStage: string | null;
}): string {
  switch (input.listingStage) {
    case "review":
      return `/listings/${input.id}/stage/review`;
    case "generate":
      return `/listings/${input.id}/stage/generate`;
    case "complete":
      return `/listings/${input.id}/content`;
    case "upload":
      return `/listings/${input.id}/stage/upload`;
    case "plan":
    default:
      return `/listings/${input.id}/stage/plan`;
  }
}

export function resolveListingPath(input: {
  id: string;
  listingStage: string | null;
}): string {
  return resolveListingResumePath(input);
}

export function canAccessListingStage(
  currentStage: string | null | undefined,
  requestedStage: Exclude<ListingStage, "complete">
): boolean {
  if (!currentStage || currentStage === "complete") {
    return false;
  }

  const currentIndex = LISTING_STAGE_ACCESS_ORDER.indexOf(
    currentStage as ListingStage
  );
  const requestedIndex = LISTING_STAGE_ACCESS_ORDER.indexOf(requestedStage);

  if (currentIndex === -1 || requestedIndex === -1) {
    return false;
  }

  return requestedIndex <= currentIndex;
}

export function formatListingStageLabel(stage?: string | null): string {
  if (!stage) {
    return "Draft";
  }
  return stage.charAt(0).toUpperCase() + stage.slice(1);
}

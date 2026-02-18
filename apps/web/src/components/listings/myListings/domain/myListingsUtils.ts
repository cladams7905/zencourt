import {
  MAX_LISTING_IMAGES,
  type ListingRowViewModel,
  type ListingSummaryItem
} from "@web/src/components/listings/my-listings/shared";
import {
  LISTING_STAGE_LABELS,
  resolveListingPath as resolveSharedListingPath,
  formatListingStageLabel,
  type ListingStage
} from "../../shared";

export const resolveListingPath = (listing: {
  id: string;
  listingStage: string | null;
}) => resolveSharedListingPath(listing);

export const formatDateLabel = (value?: string | Date | null) => {
  if (!value) {
    return "Never";
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Never";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
};

export const formatStageLabel = (stage?: string | null) => {
  return formatListingStageLabel(stage);
};

export const toListingRowViewModel = (
  listing: ListingSummaryItem
): ListingRowViewModel => {
  const imageCount = Math.min(listing.imageCount ?? 0, MAX_LISTING_IMAGES);
  const previewImages = listing.previewImages ?? [];
  const remainingCount = Math.max(imageCount - previewImages.length, 0);
  const stageLabel =
    LISTING_STAGE_LABELS[(listing.listingStage ?? "") as ListingStage] ??
    "Categorize";

  return {
    id: listing.id,
    path: resolveListingPath(listing),
    title: listing.title?.trim() || "Untitled listing",
    lastOpenedLabel: formatDateLabel(listing.lastOpenedAt ?? null),
    imageCount,
    previewImages,
    remainingCount,
    stageLabel,
    draftTooltipLabel: `Draft (${formatStageLabel(listing.listingStage)})`,
    showDraftBadge: listing.listingStage !== "create"
  };
};

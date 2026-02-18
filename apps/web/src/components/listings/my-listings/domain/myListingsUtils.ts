import {
  MAX_LISTING_IMAGES,
  type ListingRowViewModel,
  type ListingSummaryItem
} from "@web/src/components/listings/my-listings/shared";
import { LISTING_STAGE_LABELS, type ListingStage } from "../../shared";

export const resolveListingPath = (listing: {
  id: string;
  listingStage: string | null;
}) => {
  switch (listing.listingStage) {
    case "review":
      return `/listings/${listing.id}/review`;
    case "generate":
      return `/listings/${listing.id}/generate`;
    case "create":
      return `/listings/${listing.id}/create`;
    case "categorize":
    default:
      return `/listings/${listing.id}/categorize`;
  }
};

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
  if (!stage) return "Draft";
  return stage.charAt(0).toUpperCase() + stage.slice(1);
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

type FetchListingsResponse = {
  items: ListingSummaryItem[];
  hasMore: boolean;
};

export const fetchListingsPage = async ({
  offset,
  limit
}: {
  offset: number;
  limit: number;
}): Promise<FetchListingsResponse> => {
  const response = await fetch(
    `/api/v1/listings?offset=${offset}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error("Failed to load more listings.");
  }

  return response.json() as Promise<FetchListingsResponse>;
};

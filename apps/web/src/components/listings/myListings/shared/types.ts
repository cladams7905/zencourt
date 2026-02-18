export type ListingSummaryItem = {
  id: string;
  title: string | null;
  listingStage: string | null;
  lastOpenedAt: string | Date | null;
  imageCount: number;
  previewImages: string[];
};

export type MyListingsViewProps = {
  initialListings: ListingSummaryItem[];
  initialHasMore: boolean;
};

export type ListingRowViewModel = {
  id: string;
  path: string;
  title: string;
  lastOpenedLabel: string;
  imageCount: number;
  previewImages: string[];
  remainingCount: number;
  stageLabel: string;
  draftTooltipLabel: string;
  showDraftBadge: boolean;
};

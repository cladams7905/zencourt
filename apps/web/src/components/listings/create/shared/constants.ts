import type { ListingContentSubcategory } from "@shared/types/models";

export type ListingCreateMediaTab = "videos" | "images";

export const MEDIA_TAB_LABELS: Record<ListingCreateMediaTab, string> = {
  videos: "Videos",
  images: "Photos"
};

export const SUBCATEGORY_LABELS: Record<ListingContentSubcategory, string> = {
  new_listing: "New Listing",
  open_house: "Open House",
  price_change: "Price Change",
  status_update: "Status Update",
  property_features: "Property Features"
};

export const GENERATED_BATCH_SIZE = 4;

import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentMediaTab } from "@web/src/lib/domain/listings/content/create";

export type { ListingContentMediaTab } from "@web/src/lib/domain/listings/content/create";

export const MEDIA_TAB_LABELS: Record<ListingContentMediaTab, string> = {
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
export const LISTING_CREATE_INITIAL_PAGE_SIZE = 8;

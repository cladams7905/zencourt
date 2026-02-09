export const LISTING_CONTENT_SUBCATEGORIES = [
  "new_listing",
  "open_house",
  "price_change",
  "status_update",
  "property_features"
] as const;

export type ListingContentSubcategory =
  (typeof LISTING_CONTENT_SUBCATEGORIES)[number];

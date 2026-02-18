import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";

export function parseInitialMediaTab(value?: string): ListingCreateMediaTab {
  return value === "photos" ? "images" : "videos";
}

export function parseInitialSubcategory(
  value?: string
): ListingContentSubcategory {
  if (
    value &&
    LISTING_CONTENT_SUBCATEGORIES.includes(value as ListingContentSubcategory)
  ) {
    return value as ListingContentSubcategory;
  }
  return LISTING_CONTENT_SUBCATEGORIES[0];
}

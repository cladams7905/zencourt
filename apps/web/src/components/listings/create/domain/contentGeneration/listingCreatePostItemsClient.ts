import { fetchApiData } from "@web/src/lib/core/http/client";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";

export type ListingCreatePostItemsPage = {
  items: ContentItem[];
  hasMore: boolean;
  nextOffset: number;
};

export function buildListingCreatePostItemsPageKey(
  listingId: string,
  params: {
    mediaTab?: ListingCreateMediaTab;
    subcategory?: ListingContentSubcategory;
    limit?: number;
    offset?: number;
  }
) {
  const searchParams = new URLSearchParams();
  if (params.mediaTab) {
    searchParams.set("mediaTab", params.mediaTab);
  }
  if (params.subcategory) {
    searchParams.set("subcategory", params.subcategory);
  }
  if (typeof params.limit === "number") {
    searchParams.set("limit", String(params.limit));
  }
  if (typeof params.offset === "number") {
    searchParams.set("offset", String(params.offset));
  }

  const query = searchParams.toString();
  return query
    ? `/api/v1/listings/${listingId}/create-post-items?${query}`
    : `/api/v1/listings/${listingId}/create-post-items`;
}

export const buildListingCreatePostItemsPageUrl =
  buildListingCreatePostItemsPageKey;

export async function fetchListingCreatePostItemsPage(
  listingId: string,
  params: {
    mediaTab?: ListingCreateMediaTab;
    subcategory?: ListingContentSubcategory;
    limit?: number;
    offset?: number;
  }
): Promise<ListingCreatePostItemsPage> {
  return fetchApiData<ListingCreatePostItemsPage>(
    buildListingCreatePostItemsPageKey(listingId, params),
    undefined,
    "Failed to load listing create content."
  );
}

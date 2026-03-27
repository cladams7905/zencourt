import { fetchApiData } from "@web/src/lib/core/http/client";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";

export type ListingContentItemsPage = {
  items: ContentItem[];
  hasMore: boolean;
  nextOffset: number;
};

export function buildListingContentItemsPageKey(
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
    ? `/api/v1/listings/${listingId}/content?${query}`
    : `/api/v1/listings/${listingId}/content`;
}

export const buildListingContentItemsPageUrl = buildListingContentItemsPageKey;

export async function fetchListingContentItemsPage(
  listingId: string,
  params: {
    mediaTab?: ListingCreateMediaTab;
    subcategory?: ListingContentSubcategory;
    limit?: number;
    offset?: number;
  }
): Promise<ListingContentItemsPage> {
  return fetchApiData<ListingContentItemsPage>(
    buildListingContentItemsPageKey(listingId, params),
    undefined,
    "Failed to load listing create content."
  );
}

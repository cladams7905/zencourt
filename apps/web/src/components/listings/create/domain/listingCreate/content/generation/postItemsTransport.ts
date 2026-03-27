"use client";

import { mutate as mutateSWR } from "swr";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildListingCreatePostItemsPageKey,
  fetchListingCreatePostItemsPage,
  type ListingCreatePostItemsPage
} from "./listingCreatePostItemsClient";

export async function fetchListingCreatePostItemsPageCached(
  listingId: string,
  params: {
    mediaTab: ListingCreateMediaTab;
    subcategory: ListingContentSubcategory;
    limit: number;
    offset: number;
  }
): Promise<ListingCreatePostItemsPage> {
  const key = buildListingCreatePostItemsPageKey(listingId, params);
  const page = await mutateSWR<ListingCreatePostItemsPage>(
    key,
    fetchListingCreatePostItemsPage(listingId, params),
    {
      populateCache: true,
      revalidate: false
    }
  );

  return page ?? fetchListingCreatePostItemsPage(listingId, params);
}

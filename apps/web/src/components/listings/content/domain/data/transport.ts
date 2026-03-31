"use client";

import { mutate as mutateSWR } from "swr";
import type { ListingContentMediaTab } from "@web/src/components/listings/content/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildListingContentItemsPageKey,
  fetchListingContentItemsPage,
  type ListingContentItemsPage
} from "./client";

export async function fetchListingContentItemsPageCached(
  listingId: string,
  params: {
    mediaTab: ListingContentMediaTab;
    subcategory: ListingContentSubcategory;
    limit: number;
    offset: number;
  }
): Promise<ListingContentItemsPage> {
  const key = buildListingContentItemsPageKey(listingId, params);
  const page = await mutateSWR<ListingContentItemsPage>(
    key,
    fetchListingContentItemsPage(listingId, params),
    {
      populateCache: true,
      revalidate: false
    }
  );

  return page ?? fetchListingContentItemsPage(listingId, params);
}

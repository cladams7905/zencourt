"use client";

import { mutate as mutateSWR } from "swr";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  buildListingContentItemsPageKey,
  fetchListingContentItemsPage,
  type ListingContentItemsPage
} from "./client";

export async function fetchListingContentItemsPageCached(
  listingId: string,
  params: {
    mediaTab: ListingCreateMediaTab;
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

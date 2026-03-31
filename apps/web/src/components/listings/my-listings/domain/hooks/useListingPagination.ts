"use client";

import * as React from "react";
import {
  buildListingsPageUrl,
  fetchListingsPage,
  type ListingsOffsetPage
} from "@web/src/components/listings/myListings/domain/services";
import {
  MY_LISTINGS_PAGE_SIZE,
  type ListingSummaryItem
} from "@web/src/components/listings/myListings/shared";
import { useInfiniteSwrPages } from "@web/src/components/shared/pagination";

type UseListingPaginationParams = {
  initialListings: ListingSummaryItem[];
  initialHasMore: boolean;
};

export const useListingPagination = ({
  initialListings,
  initialHasMore
}: UseListingPaginationParams) => {
  const getKey = React.useCallback(
    (pageIndex: number, previousPageData: ListingsOffsetPage | null) => {
      if (pageIndex > 0 && previousPageData && !previousPageData.hasMore) {
        return null;
      }

      const offset = initialListings.length + pageIndex * MY_LISTINGS_PAGE_SIZE;
      return buildListingsPageUrl({ offset, limit: MY_LISTINGS_PAGE_SIZE });
    },
    [initialListings.length]
  );
  const {
    items: listings,
    hasMore,
    isLoadingMore,
    errorMessage: loadError,
    loadMoreRef,
    fetchMore: fetchMoreListings
  } = useInfiniteSwrPages({
    getKey,
    fetcher: fetchListingsPage,
    selectItems: (page) => page.items,
    getHasMore: (page) => page.hasMore,
    initialItems: initialListings,
    initialHasMore,
    swr: {
      revalidateFirstPage: false
    }
  });

  return {
    listings,
    hasMore,
    isLoadingMore,
    loadError,
    loadMoreRef,
    fetchMoreListings
  };
};

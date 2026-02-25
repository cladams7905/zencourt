"use client";

import * as React from "react";
import useSWRInfinite from "swr/infinite";
import {
  buildListingsPageUrl,
  fetchListingsPage
} from "@web/src/components/listings/myListings/domain/services";
import {
  MY_LISTINGS_PAGE_SIZE,
  type ListingSummaryItem
} from "@web/src/components/listings/myListings/shared";

type UseListingPaginationParams = {
  initialListings: ListingSummaryItem[];
  initialHasMore: boolean;
};

export const useListingPagination = ({
  initialListings,
  initialHasMore
}: UseListingPaginationParams) => {
  const loadMoreRef = React.useRef<HTMLDivElement>(null);
  const getKey = React.useCallback(
    (pageIndex: number, previousPageData?: { hasMore: boolean }) => {
      if (pageIndex > 0 && previousPageData && !previousPageData.hasMore) {
        return null;
      }

      const offset = initialListings.length + pageIndex * MY_LISTINGS_PAGE_SIZE;
      return buildListingsPageUrl({ offset, limit: MY_LISTINGS_PAGE_SIZE });
    },
    [initialListings.length]
  );
  const {
    data: pages = [],
    error,
    isValidating,
    size,
    setSize
  } = useSWRInfinite(getKey, fetchListingsPage, {
    revalidateFirstPage: false
  });

  const listings = React.useMemo(
    () => [...initialListings, ...pages.flatMap((page) => page.items)],
    [initialListings, pages]
  );
  const hasMore = React.useMemo(() => {
    if (pages.length === 0) {
      return initialHasMore;
    }
    return pages[pages.length - 1]?.hasMore ?? false;
  }, [initialHasMore, pages]);
  const isLoadingMore = isValidating;
  const loadError = error instanceof Error ? error.message : null;

  const fetchMoreListings = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }
    await setSize(size + 1);
  }, [hasMore, isLoadingMore, setSize, size]);

  React.useEffect(() => {
    const node = loadMoreRef.current;
    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void fetchMoreListings();
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchMoreListings, hasMore]);

  return {
    listings,
    hasMore,
    isLoadingMore,
    loadError,
    loadMoreRef,
    fetchMoreListings
  };
};

import * as React from "react";
import { fetchListingsPage } from "@web/src/components/listings/myListings/domain/services";
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
  const [listings, setListings] =
    React.useState<ListingSummaryItem[]>(initialListings);
  const [offset, setOffset] = React.useState(initialListings.length);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement>(null);

  const fetchMoreListings = React.useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    setLoadError(null);
    try {
      const data = await fetchListingsPage({
        offset,
        limit: MY_LISTINGS_PAGE_SIZE
      });
      setListings((prev) => [...prev, ...data.items]);
      setOffset((prev) => prev + data.items.length);
      setHasMore(data.hasMore);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to load listings."
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, offset]);

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

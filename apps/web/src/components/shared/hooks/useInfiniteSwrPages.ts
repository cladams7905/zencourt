"use client";

import * as React from "react";
import useSWRInfinite from "swr/infinite";
import { useInfiniteIntersection } from "./useInfiniteIntersection";

export function useInfiniteSwrPages<TPage, TItem, TKey>(options: {
  enabled?: boolean;
  getKey: (pageIndex: number, previousPage: TPage | null) => TKey | null;
  fetcher: (key: TKey) => Promise<TPage>;
  selectItems: (page: TPage) => TItem[];
  getHasMore: (page: TPage) => boolean;
  initialItems?: TItem[];
  initialHasMore?: boolean;
  observer?: {
    root?: HTMLElement | null;
    rootMargin?: string;
  };
  swr?: {
    revalidateFirstPage?: boolean;
    dedupingInterval?: number;
  };
}) {
  const {
    enabled = true,
    getKey,
    fetcher,
    selectItems,
    getHasMore,
    initialItems = [],
    initialHasMore = false,
    observer,
    swr
  } = options;

  const {
    data,
    error,
    isValidating,
    isLoading,
    size,
    setSize,
    mutate
  } = useSWRInfinite<TPage>(
    ((pageIndex: number, previousPageData: TPage | null) =>
      enabled ? getKey(pageIndex, previousPageData) : null) as never,
    fetcher as never,
    {
      revalidateFirstPage: swr?.revalidateFirstPage,
      dedupingInterval: swr?.dedupingInterval
    }
  );

  const pages = React.useMemo(() => data ?? [], [data]);

  const items = React.useMemo(
    () => [...initialItems, ...pages.flatMap((page) => selectItems(page))],
    [initialItems, pages, selectItems]
  );

  const hasMore = React.useMemo(() => {
    if (pages.length === 0) {
      return initialHasMore;
    }

    return getHasMore(pages[pages.length - 1] as TPage);
  }, [getHasMore, initialHasMore, pages]);

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  const isInitialLoading =
    enabled && items.length === 0 && !errorMessage && Boolean(isLoading);

  const isLoadingMore =
    enabled && items.length > 0 && Boolean(isValidating) && hasMore;

  const fetchMore = React.useCallback(async () => {
    if (isValidating || !hasMore) {
      return;
    }

    await setSize(size + 1);
  }, [hasMore, isValidating, setSize, size]);

  const retry = React.useCallback(() => {
    void mutate();
  }, [mutate]);

  const loadMoreRef = useInfiniteIntersection({
    enabled,
    hasMore,
    isLoadingMore,
    onLoadMore: fetchMore,
    root: observer?.root,
    rootMargin: observer?.rootMargin
  });

  return {
    items,
    hasMore,
    isInitialLoading,
    isLoadingMore,
    errorMessage,
    fetchMore,
    retry,
    loadMoreRef,
    pages
  };
}

"use client";

import * as React from "react";

export function useInfiniteIntersection(options: {
  enabled?: boolean;
  hasMore: boolean;
  isLoadingMore?: boolean;
  onLoadMore: () => void | Promise<void>;
  root?: HTMLElement | null;
  rootMargin?: string;
}) {
  const {
    enabled = true,
    hasMore,
    isLoadingMore = false,
    onLoadMore,
    root,
    rootMargin = "200px"
  } = options;
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);

  const loadMoreRef = React.useCallback((nextNode: HTMLDivElement | null) => {
    setNode(nextNode);
  }, []);

  React.useEffect(() => {
    if (!enabled || !node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isLoadingMore) {
            void onLoadMore();
          }
        });
      },
      { root, rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, hasMore, isLoadingMore, node, onLoadMore, root, rootMargin]);

  return loadMoreRef;
}

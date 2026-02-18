import * as React from "react";

interface UseMediaPaginationArgs {
  pageSize: number;
  totalCount: number;
  resetDeps: React.DependencyList;
}

export const useMediaPagination = ({
  pageSize,
  totalCount,
  resetDeps
}: UseMediaPaginationArgs) => {
  const [visibleCount, setVisibleCount] = React.useState(pageSize);
  const [loadMoreNode, setLoadMoreNode] = React.useState<HTMLDivElement | null>(
    null
  );
  const loadMoreRef = React.useCallback((node: HTMLDivElement | null) => {
    setLoadMoreNode(node);
  }, []);

  React.useEffect(() => {
    setVisibleCount(pageSize);
    // reset when filters/sort/list changes
  }, [pageSize, ...resetDeps]);

  React.useEffect(() => {
    const node = loadMoreNode;
    if (!node || totalCount <= visibleCount) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCount((prev) => Math.min(prev + pageSize, totalCount));
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreNode, pageSize, totalCount, visibleCount]);

  return {
    visibleCount,
    loadMoreRef,
    hasMore: totalCount > visibleCount
  };
};

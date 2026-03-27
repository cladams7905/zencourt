"use client";

import * as React from "react";
import useSWRInfinite from "swr/infinite";
import {
  getUserMediaPageForReelPicker,
  type UserMediaReelPickerPage
} from "@web/src/server/actions/media/commands";
import { USER_MEDIA_REEL_PICKER_PAGE_SIZE } from "@web/src/components/listings/create/media/video/userMediaReelPickerConstants";

/** Stable key segment so SWR reuses the same cache across popover opens (cursor is null for page 0). */
type UserMediaReelPickerKey = readonly ["user-media-reel-picker", string | null];

export function useUserMediaReelPickerInfinite(options: {
  enabled: boolean;
  /** Scroll container for nested IntersectionObserver root (overflow-y-auto region). */
  scrollRoot: HTMLElement | null;
}) {
  const { enabled, scrollRoot } = options;

  const getKey = React.useCallback(
    (
      pageIndex: number,
      previousPageData: UserMediaReelPickerPage | null
    ): UserMediaReelPickerKey | null => {
      if (!enabled) {
        return null;
      }
      if (pageIndex > 0 && (!previousPageData || !previousPageData.hasMore)) {
        return null;
      }
      const cursor =
        pageIndex === 0 ? null : (previousPageData?.nextCursor ?? null);
      if (pageIndex > 0 && !cursor) {
        return null;
      }
      return ["user-media-reel-picker", cursor];
    },
    [enabled]
  );

  const fetcher = React.useCallback(
    async ([, cursor]: UserMediaReelPickerKey) => {
      try {
        return await getUserMediaPageForReelPicker({
          limit: USER_MEDIA_REEL_PICKER_PAGE_SIZE,
          cursor: cursor ?? undefined
        });
      } catch {
        throw new Error("Failed to load user media.");
      }
    },
    []
  );

  const {
    data: pages,
    error,
    isValidating,
    isLoading,
    size,
    setSize,
    mutate
  } = useSWRInfinite<UserMediaReelPickerPage>(getKey, fetcher, {
    revalidateFirstPage: false,
    // Stable key (no session id) keeps SWR’s cache across popover opens; rely on default
    // revalidate-on-focus/mount sparingly so first load always runs. Prefer isLoading for UI.
    dedupingInterval: 2000
  });

  const items = React.useMemo(
    () => pages?.flatMap((page) => page.items) ?? [],
    [pages]
  );

  const hasMore = React.useMemo(() => {
    if (!pages?.length) {
      return false;
    }
    return pages[pages.length - 1]?.hasMore ?? false;
  }, [pages]);

  const loadMoreNodeRef = React.useRef<HTMLDivElement | null>(null);
  const loadMoreRef = React.useCallback((node: HTMLDivElement | null) => {
    loadMoreNodeRef.current = node;
  }, []);

  const fetchMore = React.useCallback(async () => {
    if (isValidating || !hasMore) {
      return;
    }
    await setSize(size + 1);
  }, [hasMore, isValidating, setSize, size]);

  React.useEffect(() => {
    const root = scrollRoot;
    const node = loadMoreNodeRef.current;
    if (!enabled || !root || !node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            void fetchMore();
          }
        });
      },
      { root, rootMargin: "200px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, fetchMore, hasMore, scrollRoot, pages?.length, size]);

  const errorMessage =
    error instanceof Error ? error.message : error ? String(error) : null;

  const isInitialLoading =
    Boolean(enabled) &&
    items.length === 0 &&
    !errorMessage &&
    Boolean(isLoading);

  const isLoadingMore =
    Boolean(enabled) && items.length > 0 && isValidating && hasMore;

  const retry = React.useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    items,
    errorMessage,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    loadMoreRef,
    retry
  };
}

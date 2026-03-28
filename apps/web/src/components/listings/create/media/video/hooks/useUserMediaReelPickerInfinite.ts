"use client";

import * as React from "react";
import {
  getUserMediaPageForReelPicker,
  type UserMediaReelPickerPage
} from "@web/src/server/actions/media/commands";
import { USER_MEDIA_REEL_PICKER_PAGE_SIZE } from "@web/src/components/listings/create/media/video/constants";
import { useInfiniteSwrPages } from "@web/src/components/shared/pagination";

/** Stable key segment so SWR reuses the same cache across popover opens (cursor is null for page 0). */
type UserMediaReelPickerKey = readonly [
  "user-media-reel-picker",
  string | null
];

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
    items,
    errorMessage,
    isInitialLoading,
    isLoadingMore,
    hasMore,
    loadMoreRef,
    retry
  } = useInfiniteSwrPages<
    UserMediaReelPickerPage,
    UserMediaReelPickerPage["items"][number],
    UserMediaReelPickerKey
  >({
    enabled,
    getKey,
    fetcher,
    selectItems: (page) => page.items,
    getHasMore: (page) => page.hasMore,
    observer: {
      root: scrollRoot,
      rootMargin: "200px"
    },
    swr: {
      revalidateFirstPage: false,
      dedupingInterval: 2000
    }
  });

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

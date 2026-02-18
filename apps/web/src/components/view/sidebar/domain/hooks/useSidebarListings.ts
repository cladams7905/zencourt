import * as React from "react";
import {
  addListingSidebarListener,
  type ListingSidebarUpdate
} from "@web/src/lib/listingSidebarEvents";
import type { ListingSidebarItem } from "@web/src/components/view/sidebar/shared";
import { buildSidebarListingsViewModel } from "@web/src/components/view/sidebar/domain/viewModel";

const mergeSidebarListingUpdate = (
  previousItems: ListingSidebarItem[],
  update: ListingSidebarUpdate
) => {
  const index = previousItems.findIndex((item) => item.id === update.id);
  if (index === -1) {
    return [
      {
        id: update.id,
        title: update.title ?? null,
        listingStage: update.listingStage ?? "categorize",
        lastOpenedAt: update.lastOpenedAt ?? new Date().toISOString()
      },
      ...previousItems
    ];
  }

  const next = [...previousItems];
  const existing = next[index];
  next[index] = {
    ...existing,
    title: update.title !== undefined ? update.title : existing.title,
    listingStage:
      update.listingStage !== undefined
        ? update.listingStage
        : existing.listingStage,
    lastOpenedAt:
      update.lastOpenedAt !== undefined
        ? update.lastOpenedAt
        : existing.lastOpenedAt
  };
  return next;
};

export const useSidebarListings = (listings: ListingSidebarItem[]) => {
  const [visibleListings, setVisibleListings] =
    React.useState<ListingSidebarItem[]>(listings);
  const [, startListingsTransition] = React.useTransition();
  const [pendingListingIds, setPendingListingIds] = React.useState(
    () => new Set<string>()
  );
  const pendingListingTimeouts = React.useRef(new Map<string, number>());

  const markListingPending = React.useCallback((listingId: string) => {
    const timeout = pendingListingTimeouts.current.get(listingId);
    if (timeout) {
      window.clearTimeout(timeout);
    }

    setPendingListingIds((prev) => {
      if (prev.has(listingId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(listingId);
      return next;
    });

    const nextTimeout = window.setTimeout(() => {
      pendingListingTimeouts.current.delete(listingId);
      setPendingListingIds((prev) => {
        if (!prev.has(listingId)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    }, 1200);
    pendingListingTimeouts.current.set(listingId, nextTimeout);
  }, []);

  React.useEffect(
    () => () => {
      pendingListingTimeouts.current.forEach((timeout) =>
        window.clearTimeout(timeout)
      );
      pendingListingTimeouts.current.clear();
    },
    []
  );

  React.useEffect(() => {
    startListingsTransition(() => setVisibleListings(listings));
  }, [listings]);

  React.useEffect(
    () =>
      addListingSidebarListener((update: ListingSidebarUpdate) => {
        markListingPending(update.id);
        startListingsTransition(() =>
          setVisibleListings((prev) => mergeSidebarListingUpdate(prev, update))
        );
      }),
    [markListingPending]
  );

  return React.useMemo(
    () => ({
      ...buildSidebarListingsViewModel(visibleListings),
      pendingListingIds
    }),
    [visibleListings, pendingListingIds]
  );
};

import * as React from "react";
import {
  addListingSidebarListener,
  type ListingSidebarUpdate
} from "@web/src/lib/domain/listings/sidebarEvents";
import type { ListingSidebarItem } from "@web/src/components/view/sidebar/shared";
import { buildSidebarListingsViewModel } from "@web/src/components/view/sidebar/domain/viewModel";

const mergeSidebarListingUpdate = (
  previousItems: ListingSidebarItem[],
  update: ListingSidebarUpdate
) => {
  const index = previousItems.findIndex((item) => item.id === update.id);
  if (index === -1) {
    return {
      items: [
        {
          id: update.id,
          title: update.title ?? null,
          listingStage: update.listingStage ?? "upload",
          lastOpenedAt: update.lastOpenedAt ?? new Date().toISOString()
        },
        ...previousItems
      ],
      changed: true
    };
  }

  const next = [...previousItems];
  const existing = next[index];
  const merged = {
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
  const changed =
    merged.title !== existing.title ||
    merged.listingStage !== existing.listingStage ||
    merged.lastOpenedAt !== existing.lastOpenedAt;
  if (!changed) {
    return {
      items: previousItems,
      changed: false
    };
  }
  next[index] = merged;
  return {
    items: next,
    changed: true
  };
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
        startListingsTransition(() =>
          setVisibleListings((prev) => {
            const merged = mergeSidebarListingUpdate(prev, update);
            if (!merged.changed) {
              return prev;
            }
            markListingPending(update.id);
            return merged.items;
          })
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

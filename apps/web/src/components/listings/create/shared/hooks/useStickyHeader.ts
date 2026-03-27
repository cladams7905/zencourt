import * as React from "react";
import type { ListingCreateFilterStickyTopOffsets } from "@web/src/components/listings/create/shared/listingCreateLayout";

/**
 * Detects when a sentinel element scrolls past a sticky offset,
 * indicating the sticky header is actively "stuck".
 *
 * `stickyTopOffsets` must match the filter bar’s `sticky top` values
 * (see {@link getListingCreateFilterStickyTopOffsets}).
 */
export function useStickyHeader(stickyTopOffsets: ListingCreateFilterStickyTopOffsets) {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [isSticky, setIsSticky] = React.useState(false);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    // Find the nearest scrollable ancestor to use as the observer root.
    let root: HTMLElement | null = null;
    let ancestor: HTMLElement | null = sentinel.parentElement;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        root = ancestor;
        break;
      }
      ancestor = ancestor.parentElement;
    }

    const mdQuery = window.matchMedia("(min-width: 768px)");
    const stickyTopPx = () =>
      mdQuery.matches
        ? stickyTopOffsets.mdPx
        : stickyTopOffsets.mobilePx;

    let observer: IntersectionObserver | null = null;

    const attachObserver = () => {
      observer?.disconnect();
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry) {
            setIsSticky(!entry.isIntersecting);
          }
        },
        {
          root,
          rootMargin: `-${stickyTopPx()}px 0px 0px 0px`,
          threshold: 0
        }
      );
      observer.observe(sentinel);
    };

    attachObserver();
    mdQuery.addEventListener("change", attachObserver);

    return () => {
      mdQuery.removeEventListener("change", attachObserver);
      observer?.disconnect();
    };
  }, [stickyTopOffsets.mobilePx, stickyTopOffsets.mdPx]);

  return { sentinelRef, isSticky };
}

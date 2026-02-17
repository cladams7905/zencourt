import * as React from "react";

/**
 * Detects when a sentinel element scrolls past a sticky offset,
 * indicating the sticky header is actively "stuck".
 */
export function useStickyHeader() {
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

    // A negative top rootMargin equal to the sticky offset means the
    // sentinel is considered "not intersecting" exactly when the sticky
    // bar starts sticking.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry) {
          setIsSticky(!entry.isIntersecting);
        }
      },
      { root, rootMargin: "-88px 0px 0px 0px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return { sentinelRef, isSticky };
}

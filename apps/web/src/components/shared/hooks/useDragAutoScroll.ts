import * as React from "react";

const getScrollParent = (el: HTMLElement): HTMLElement => {
  let parent = el.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") return parent;
    parent = parent.parentElement;
  }
  return document.documentElement;
};

type UseDragAutoScrollParams = {
  enabled: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onDragSessionEnd: () => void;
};

export function useDragAutoScroll({
  enabled,
  anchorRef,
  onDragSessionEnd
}: UseDragAutoScrollParams) {
  const lastDragClientYRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }
    const scrollContainer = anchorRef.current
      ? getScrollParent(anchorRef.current)
      : null;
    let rafId: number | null = null;

    const handleDragOver = (event: DragEvent) => {
      lastDragClientYRef.current = event.clientY;
    };

    const tick = () => {
      const clientY = lastDragClientYRef.current;
      if (clientY !== null && scrollContainer) {
        const threshold = 200;
        const topThreshold = 250;
        const viewportHeight = window.innerHeight;
        const headerBottom = anchorRef.current?.getBoundingClientRect().bottom ?? 0;
        let scrollDelta = 0;
        if (clientY < headerBottom + topThreshold) {
          const intensity = (headerBottom + topThreshold - clientY) / topThreshold;
          scrollDelta = -Math.ceil(3 + intensity * 12);
        } else if (clientY > viewportHeight - threshold) {
          const intensity = (clientY - (viewportHeight - threshold)) / threshold;
          scrollDelta = Math.ceil(3 + intensity * 10);
        }
        if (scrollDelta !== 0) {
          scrollContainer.scrollBy({ top: scrollDelta, behavior: "auto" });
        }
      }
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragend", onDragSessionEnd);
    window.addEventListener("drop", onDragSessionEnd);
    rafId = window.requestAnimationFrame(tick);

    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", onDragSessionEnd);
      window.removeEventListener("drop", onDragSessionEnd);
      lastDragClientYRef.current = null;
    };
  }, [anchorRef, enabled, onDragSessionEnd]);

  return { lastDragClientYRef };
}

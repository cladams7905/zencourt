import * as React from "react";

type UseHorizontalDragAutoScrollParams = {
  enabled: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onDragSessionEnd: () => void;
};

export function useHorizontalDragAutoScroll({
  enabled,
  containerRef,
  onDragSessionEnd
}: UseHorizontalDragAutoScrollParams) {
  const lastDragClientXRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!enabled) {
      return;
    }

    let rafId: number | null = null;

    const handleDragOver = (event: DragEvent) => {
      lastDragClientXRef.current = event.clientX;
    };

    const tick = () => {
      const clientX = lastDragClientXRef.current;
      const scrollContainer = containerRef.current;

      if (clientX !== null && scrollContainer) {
        const rect = scrollContainer.getBoundingClientRect();
        const threshold = 72;
        let scrollDelta = 0;

        if (clientX < rect.left + threshold) {
          const intensity = (rect.left + threshold - clientX) / threshold;
          scrollDelta = -Math.ceil(2 + intensity * 10);
        } else if (clientX > rect.right - threshold) {
          const intensity = (clientX - (rect.right - threshold)) / threshold;
          scrollDelta = Math.ceil(2 + intensity * 10);
        }

        if (scrollDelta !== 0) {
          scrollContainer.scrollBy({ left: scrollDelta, behavior: "auto" });
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
      lastDragClientXRef.current = null;
    };
  }, [containerRef, enabled, onDragSessionEnd]);

  return { lastDragClientXRef };
}

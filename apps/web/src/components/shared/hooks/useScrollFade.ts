import * as React from "react";

type ScrollFadeDirection = "none" | "right" | "left" | "both";

/**
 * Tracks horizontal scroll position of a container and returns a CSS
 * mask-image value that fades edges where more content is scrollable.
 */
export function useScrollFade() {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [fade, setFade] = React.useState<ScrollFadeDirection>("none");

  const updateFade = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    const canLeft = el.scrollLeft > 1;
    const canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    const next: ScrollFadeDirection =
      canLeft && canRight
        ? "both"
        : canLeft
          ? "left"
          : canRight
            ? "right"
            : "none";
    setFade((prev) => (prev === next ? prev : next));
  }, []);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }
    updateFade();
    el.addEventListener("scroll", updateFade, { passive: true });
    const ro = new ResizeObserver(updateFade);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateFade);
      ro.disconnect();
    };
  }, [updateFade]);

  const maskImage = React.useMemo(() => {
    switch (fade) {
      case "both":
        return "linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)";
      case "left":
        return "linear-gradient(to right, transparent, black 24px)";
      case "right":
        return "linear-gradient(to right, black calc(100% - 24px), transparent)";
      default:
        return undefined;
    }
  }, [fade]);

  return { containerRef, maskImage };
}

"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Computes the center of the intersection of a bounding rect with the viewport,
 * in fixed-position (viewport) coordinates.
 *
 * When there is no overlap (gallery off-screen), falls back to viewport center so
 * the card stays visible. When overlap height is 0 but width exists (first paint
 * before grid measures), uses the horizontal midline at that y.
 */
function getViewportIntersectionCenter(el: HTMLElement): {
  x: number;
  y: number;
} {
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(0, rect.left);
  const right = Math.min(vw, rect.right);
  const top = Math.max(0, rect.top);
  const bottom = Math.min(vh, rect.bottom);

  const hasH = right > left;
  const hasV = bottom >= top;

  if (hasH && hasV) {
    return {
      x: (left + right) / 2,
      y: top === bottom ? top : (top + bottom) / 2
    };
  }

  return { x: vw / 2, y: vh / 2 };
}

function useGalleryViewportCenter(
  boundaryRef: React.RefObject<HTMLElement | null>
) {
  const [center, setCenter] = React.useState<{ x: number; y: number }>(() => {
    if (typeof window === "undefined") {
      return { x: 0, y: 0 };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  });

  const update = React.useCallback(() => {
    const el = boundaryRef.current;
    if (!el) {
      return;
    }
    setCenter(getViewportIntersectionCenter(el));
  }, [boundaryRef]);

  React.useLayoutEffect(() => {
    const run = () => {
      update();
      requestAnimationFrame(() => {
        const again = boundaryRef.current;
        if (again) {
          setCenter(getViewportIntersectionCenter(again));
        }
      });
    };

    run();

    const el = boundaryRef.current;
    const ro = new ResizeObserver(() => {
      run();
    });
    if (el) {
      ro.observe(el);
    }

    window.addEventListener("scroll", run, true);
    window.addEventListener("resize", run);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", run);
    vv?.addEventListener("scroll", run);

    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", run, true);
      window.removeEventListener("resize", run);
      vv?.removeEventListener("resize", run);
      vv?.removeEventListener("scroll", run);
    };
  }, [update, boundaryRef]);

  return center;
}

type GalleryViewportCenteredOverlayProps = {
  boundaryRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  /** z-index for the fixed layer (default matches elevated panels). */
  zIndex?: number;
};

/**
 * Renders children in a fixed layer at the center of the visible portion of
 * `boundaryRef` (gallery ∩ viewport), updating on scroll/resize. Uses a portal
 * so the card is not clipped by `overflow` on ancestors.
 */
export function GalleryViewportCenteredOverlay({
  boundaryRef,
  children,
  zIndex = 60
}: GalleryViewportCenteredOverlayProps) {
  const center = useGalleryViewportCenter(boundaryRef);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none"
      style={{
        position: "fixed",
        left: center.x,
        top: center.y,
        transform: "translate(-50%, -50%)",
        zIndex
      }}
    >
      {/* Explicit width so children with w-full can grow (shrink-wrapped fixed parents ignore max-w-*). */}
      <div className="pointer-events-auto w-full px-1 sm:px-2">{children}</div>
    </div>,
    document.body
  );
}

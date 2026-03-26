import * as React from "react";
import { renderHook } from "@testing-library/react";
import { useHorizontalDragAutoScroll } from "@web/src/components/listings/create/shared/hooks/useHorizontalDragAutoScroll";

describe("useHorizontalDragAutoScroll", () => {
  const originalRaf = window.requestAnimationFrame;
  const originalCancelRaf = window.cancelAnimationFrame;

  beforeEach(() => {
    window.requestAnimationFrame = jest.fn(() => 1);
    window.cancelAnimationFrame = jest.fn();
  });

  afterEach(() => {
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancelRaf;
  });

  it("tracks drag position and scrolls horizontally near the right edge", () => {
    const onDragSessionEnd = jest.fn();
    const container = document.createElement("div");
    container.scrollBy = jest.fn();
    container.getBoundingClientRect = () =>
      ({
        left: 100,
        right: 400,
        width: 300
      } as DOMRect);
    document.body.appendChild(container);
    const containerRef = {
      current: container
    } as React.RefObject<HTMLDivElement | null>;

    let rafCallback: FrameRequestCallback = () => {};
    window.requestAnimationFrame = jest.fn((cb) => {
      rafCallback = cb;
      return 1;
    });

    renderHook(() =>
      useHorizontalDragAutoScroll({
        enabled: true,
        containerRef,
        onDragSessionEnd
      })
    );

    const dragOver = new Event("dragover");
    Object.defineProperty(dragOver, "clientX", { value: 392 });
    window.dispatchEvent(dragOver);
    rafCallback(0);

    expect(container.scrollBy).toHaveBeenCalledWith({
      left: expect.any(Number),
      behavior: "auto"
    });
  });

  it("does not register drag listeners when disabled", () => {
    const onDragSessionEnd = jest.fn();
    const addSpy = jest.spyOn(window, "addEventListener");
    const containerRef = {
      current: null
    } as React.RefObject<HTMLDivElement | null>;

    renderHook(() =>
      useHorizontalDragAutoScroll({
        enabled: false,
        containerRef,
        onDragSessionEnd
      })
    );

    expect(addSpy).not.toHaveBeenCalledWith("dragover", expect.any(Function));
    addSpy.mockRestore();
  });
});

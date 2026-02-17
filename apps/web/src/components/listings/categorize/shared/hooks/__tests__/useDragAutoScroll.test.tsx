import * as React from "react";
import { renderHook } from "@testing-library/react";
import { useDragAutoScroll } from "@web/src/components/listings/categorize/shared/hooks/useDragAutoScroll";

describe("useDragAutoScroll", () => {
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

  it("registers and responds to drag events when enabled", () => {
    const onDragSessionEnd = jest.fn();
    const anchor = document.createElement("div");
    document.body.appendChild(anchor);
    const anchorRef = { current: anchor } as React.RefObject<HTMLElement>;

    renderHook(() =>
      useDragAutoScroll({
        enabled: true,
        anchorRef,
        onDragSessionEnd
      })
    );

    window.dispatchEvent(new Event("dragend"));
    expect(onDragSessionEnd).toHaveBeenCalled();
  });

  it("tracks drag position and attempts auto-scroll", () => {
    const onDragSessionEnd = jest.fn();
    const parent = document.createElement("div");
    parent.style.overflowY = "auto";
    parent.scrollBy = jest.fn();
    const anchor = document.createElement("div");
    parent.appendChild(anchor);
    document.body.appendChild(parent);
    anchor.getBoundingClientRect = () =>
      ({ bottom: 0 } as DOMRect);
    const anchorRef = { current: anchor } as React.RefObject<HTMLElement | null>;

    let rafCallback: FrameRequestCallback = () => {};
    window.requestAnimationFrame = jest.fn((cb) => {
      rafCallback = cb;
      return 1;
    });

    renderHook(() =>
      useDragAutoScroll({
        enabled: true,
        anchorRef,
        onDragSessionEnd
      })
    );

    const dragOver = new Event("dragover");
    Object.defineProperty(dragOver, "clientY", { value: window.innerHeight - 10 });
    window.dispatchEvent(dragOver);
    rafCallback(0);

    expect(parent.scrollBy).toHaveBeenCalled();
  });

  it("does not set up listeners when disabled", () => {
    const onDragSessionEnd = jest.fn();
    const addSpy = jest.spyOn(window, "addEventListener");
    const anchorRef = { current: null } as React.RefObject<HTMLElement | null>;

    renderHook(() =>
      useDragAutoScroll({
        enabled: false,
        anchorRef,
        onDragSessionEnd
      })
    );

    expect(addSpy).not.toHaveBeenCalledWith("dragover", expect.any(Function));
    addSpy.mockRestore();
  });
});

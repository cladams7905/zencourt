import * as React from "react";
import { act, renderHook } from "@testing-library/react";
import { useMediaPagination } from "@web/src/components/media/domain/hooks/useMediaPagination";

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];
  callback: IntersectionObserverCallback;
  observe = jest.fn();
  disconnect = jest.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    IntersectionObserverMock.instances.push(this);
  }

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this as never);
  }
}

describe("useMediaPagination", () => {
  const useTestPagination = (
    pageSize: number,
    totalCount: number,
    dep: string
  ) => {
    const resetDeps = React.useMemo(() => [dep], [dep]);
    return useMediaPagination({ pageSize, totalCount, resetDeps });
  };

  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: IntersectionObserverMock
    });
  });

  it("starts with page size and exposes hasMore", () => {
    const { result } = renderHook(() =>
      useTestPagination(12, 30, "a")
    );

    expect(result.current.visibleCount).toBe(12);
    expect(result.current.hasMore).toBe(true);
  });

  it("resets visible count when reset deps change", () => {
    const { result, rerender } = renderHook(
      (dep: string) => useTestPagination(12, 30, dep),
      { initialProps: "a" }
    );
    act(() => {
      result.current.loadMoreRef(document.createElement("div"));
    });

    const observer = IntersectionObserverMock.instances[0];
    act(() => {
      observer.trigger([{ isIntersecting: true }]);
    });

    expect(result.current.visibleCount).toBe(24);

    rerender("b");
    expect(result.current.visibleCount).toBe(12);
  });

  it("increases and clamps visible count on intersection", () => {
    const { result } = renderHook(() =>
      useTestPagination(12, 20, "a")
    );
    act(() => {
      result.current.loadMoreRef(document.createElement("div"));
    });

    const observer = IntersectionObserverMock.instances[0];

    act(() => {
      observer.trigger([{ isIntersecting: true }]);
    });
    expect(result.current.visibleCount).toBe(20);
    expect(result.current.hasMore).toBe(false);
  });

  it("does not create observer when all items are visible", () => {
    renderHook(() => useTestPagination(12, 10, "a"));

    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });
});

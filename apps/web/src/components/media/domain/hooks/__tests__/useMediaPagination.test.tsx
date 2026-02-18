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
      useMediaPagination({ pageSize: 12, totalCount: 30, resetDeps: ["a"] })
    );

    expect(result.current.visibleCount).toBe(12);
    expect(result.current.hasMore).toBe(true);
  });

  it("resets visible count when reset deps change", () => {
    const { result, rerender } = renderHook(
      (dep: string) =>
        useMediaPagination({ pageSize: 12, totalCount: 30, resetDeps: [dep] }),
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
      useMediaPagination({ pageSize: 12, totalCount: 20, resetDeps: ["a"] })
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
    renderHook(() =>
      useMediaPagination({ pageSize: 12, totalCount: 10, resetDeps: ["a"] })
    );

    expect(IntersectionObserverMock.instances).toHaveLength(0);
  });
});

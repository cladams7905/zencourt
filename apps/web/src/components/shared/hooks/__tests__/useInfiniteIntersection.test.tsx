import { act, renderHook } from "@testing-library/react";
import { useInfiniteIntersection } from "@web/src/components/shared/pagination/useInfiniteIntersection";

class IntersectionObserverMock {
  static instances: IntersectionObserverMock[] = [];

  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe = jest.fn();
  disconnect = jest.fn();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit
  ) {
    this.callback = callback;
    this.options = options;
    IntersectionObserverMock.instances.push(this);
  }

  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(entries as IntersectionObserverEntry[], this as never);
  }
}

describe("useInfiniteIntersection", () => {
  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: IntersectionObserverMock
    });
  });

  it("observes the sentinel when enabled and hasMore are true", () => {
    const onLoadMore = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteIntersection({
        enabled: true,
        hasMore: true,
        onLoadMore
      })
    );

    act(() => {
      result.current(document.createElement("div"));
    });

    expect(IntersectionObserverMock.instances).toHaveLength(1);
    expect(IntersectionObserverMock.instances[0]?.observe).toHaveBeenCalled();
  });

  it("passes root and rootMargin through to the observer", () => {
    const onLoadMore = jest.fn();
    const root = document.createElement("div");
    const { result } = renderHook(() =>
      useInfiniteIntersection({
        enabled: true,
        hasMore: true,
        onLoadMore,
        root,
        rootMargin: "120px"
      })
    );

    act(() => {
      result.current(document.createElement("div"));
    });

    expect(IntersectionObserverMock.instances[0]?.options).toEqual({
      root,
      rootMargin: "120px"
    });
  });

  it("does not load more while loading is already in progress", () => {
    const onLoadMore = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteIntersection({
        enabled: true,
        hasMore: true,
        isLoadingMore: true,
        onLoadMore
      })
    );

    act(() => {
      result.current(document.createElement("div"));
    });

    act(() => {
      IntersectionObserverMock.instances[0]?.trigger([{ isIntersecting: true }]);
    });

    expect(onLoadMore).not.toHaveBeenCalled();
  });
});

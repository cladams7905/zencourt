import { act, render, screen } from "@testing-library/react";
import { useStickyHeader } from "../useStickyHeader";

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

function StickyHeaderHarness({
  mobilePx,
  mdPx
}: {
  mobilePx: number;
  mdPx: number;
}) {
  const { sentinelRef, isSticky } = useStickyHeader({ mobilePx, mdPx });

  return (
    <>
      <div data-testid="sticky-state">{String(isSticky)}</div>
      <div data-testid="sentinel" ref={sentinelRef} />
    </>
  );
}

describe("useStickyHeader", () => {
  let matchMediaChangeListener: ((event: MediaQueryListEvent) => void) | null =
    null;
  let matchMediaState = false;

  beforeEach(() => {
    IntersectionObserverMock.instances = [];
    matchMediaChangeListener = null;
    matchMediaState = false;

    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: IntersectionObserverMock
    });

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: jest.fn(() => ({
        get matches() {
          return matchMediaState;
        },
        addEventListener: jest.fn(
          (_event: string, listener: (event: MediaQueryListEvent) => void) => {
            matchMediaChangeListener = listener;
          }
        ),
        removeEventListener: jest.fn(),
        media: "(min-width: 768px)"
      }))
    });
  });

  it("attaches an observer using the nearest scrollable ancestor and mobile sticky offset", () => {
    const scrollRoot = document.createElement("div");
    scrollRoot.style.overflowY = "auto";
    document.body.appendChild(scrollRoot);

    render(<StickyHeaderHarness mobilePx={80} mdPx={120} />, {
      container: scrollRoot
    });

    const sentinel = screen.getByTestId("sentinel");

    expect(IntersectionObserverMock.instances).toHaveLength(1);
    expect(IntersectionObserverMock.instances[0]?.options).toEqual({
      root: scrollRoot,
      rootMargin: "-80px 0px 0px 0px",
      threshold: 0
    });
    expect(IntersectionObserverMock.instances[0]?.observe).toHaveBeenCalledWith(
      sentinel
    );
  });

  it("updates sticky state from intersection events and reattaches on media-query changes", () => {
    render(<StickyHeaderHarness mobilePx={32} mdPx={64} />);

    expect(screen.getByTestId("sticky-state")).toHaveTextContent("false");

    act(() => {
      IntersectionObserverMock.instances[0]?.trigger([{ isIntersecting: false }]);
    });

    expect(screen.getByTestId("sticky-state")).toHaveTextContent("true");

    act(() => {
      matchMediaState = true;
      matchMediaChangeListener?.({ matches: true } as MediaQueryListEvent);
    });

    expect(IntersectionObserverMock.instances[0]?.disconnect).toHaveBeenCalled();
    expect(IntersectionObserverMock.instances).toHaveLength(2);
    expect(IntersectionObserverMock.instances[1]?.options).toEqual({
      root: null,
      rootMargin: "-64px 0px 0px 0px",
      threshold: 0
    });
  });
});

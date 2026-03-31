import { renderHook } from "@testing-library/react";
import useSWRInfinite from "swr/infinite";
import { useInfiniteIntersection } from "@web/src/components/shared/pagination/useInfiniteIntersection";
import { useInfiniteSwrPages } from "@web/src/components/shared/pagination/useInfiniteSwrPages";

jest.mock("swr/infinite", () => jest.fn());
jest.mock("@web/src/components/shared/pagination/useInfiniteIntersection", () => ({
  useInfiniteIntersection: jest.fn()
}));

describe("useInfiniteSwrPages", () => {
  const mockUseSWRInfinite = useSWRInfinite as jest.Mock;
  const mockUseInfiniteIntersection = useInfiniteIntersection as jest.Mock;
  type TestPage = {
    items: { id: string }[];
    hasMore: boolean;
  };

  beforeEach(() => {
    mockUseSWRInfinite.mockReset();
    mockUseInfiniteIntersection.mockReset();
    mockUseInfiniteIntersection.mockReturnValue(jest.fn());
  });

  it("flattens pages and prepends initial items once", () => {
    mockUseSWRInfinite.mockReturnValue({
      data: [
        { items: [{ id: "page-1" }], hasMore: true },
        { items: [{ id: "page-2" }], hasMore: false }
      ],
      error: undefined,
      isValidating: false,
      isLoading: false,
      size: 2,
      setSize: jest.fn(),
      mutate: jest.fn()
    });

    const { result } = renderHook(() =>
      useInfiniteSwrPages({
        enabled: true,
        getKey: jest.fn(),
        fetcher: jest.fn(),
        selectItems: (page: TestPage) => page.items,
        getHasMore: (page: TestPage) => page.hasMore,
        initialItems: [{ id: "initial" }],
        initialHasMore: true
      })
    );

    expect(result.current.items).toEqual([
      { id: "initial" },
      { id: "page-1" },
      { id: "page-2" }
    ]);
    expect(result.current.hasMore).toBe(false);
  });

  it("uses initialHasMore before any SWR pages are loaded", () => {
    mockUseSWRInfinite.mockReturnValue({
      data: undefined,
      error: undefined,
      isValidating: false,
      isLoading: false,
      size: 1,
      setSize: jest.fn(),
      mutate: jest.fn()
    });

    const { result } = renderHook(() =>
      useInfiniteSwrPages({
        enabled: true,
        getKey: jest.fn(),
        fetcher: jest.fn(),
        selectItems: (page: TestPage) => page.items,
        getHasMore: (page: TestPage) => page.hasMore,
        initialItems: [{ id: "initial" }],
        initialHasMore: true
      })
    );

    expect(result.current.hasMore).toBe(true);
  });

  it("does not request another page while already validating", async () => {
    const setSize = jest.fn();
    mockUseSWRInfinite.mockReturnValue({
      data: [{ items: [{ id: "page-1" }], hasMore: true }],
      error: undefined,
      isValidating: true,
      isLoading: false,
      size: 1,
      setSize,
      mutate: jest.fn()
    });

    const { result } = renderHook(() =>
      useInfiniteSwrPages({
        enabled: true,
        getKey: jest.fn(),
        fetcher: jest.fn(),
        selectItems: (page: TestPage) => page.items,
        getHasMore: (page: TestPage) => page.hasMore
      })
    );

    await result.current.fetchMore();

    expect(setSize).not.toHaveBeenCalled();
  });

  it("passes observer options through to the shared observer hook", () => {
    mockUseSWRInfinite.mockReturnValue({
      data: [{ items: [{ id: "page-1" }], hasMore: true }],
      error: undefined,
      isValidating: false,
      isLoading: false,
      size: 1,
      setSize: jest.fn(),
      mutate: jest.fn()
    });

    const root = document.createElement("div");

    renderHook(() =>
      useInfiniteSwrPages({
        enabled: true,
        getKey: jest.fn(),
        fetcher: jest.fn(),
        selectItems: (page: TestPage) => page.items,
        getHasMore: (page: TestPage) => page.hasMore,
        observer: {
          root,
          rootMargin: "240px"
        }
      })
    );

    expect(mockUseInfiniteIntersection).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        hasMore: true,
        root,
        rootMargin: "240px"
      })
    );
  });
});

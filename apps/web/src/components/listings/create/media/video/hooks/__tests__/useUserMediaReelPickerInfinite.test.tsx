import { act, renderHook } from "@testing-library/react";
import { useInfiniteSwrPages } from "@web/src/components/shared/pagination";
import { getUserMediaPageForReelPicker } from "@web/src/server/actions/media/commands";
import { useUserMediaReelPickerInfinite } from "@web/src/components/listings/create/media/video/hooks/useUserMediaReelPickerInfinite";

jest.mock("@web/src/components/shared/pagination", () => ({
  useInfiniteSwrPages: jest.fn()
}));

jest.mock("@web/src/server/actions/media/commands", () => ({
  getUserMediaPageForReelPicker: jest.fn()
}));

describe("useUserMediaReelPickerInfinite", () => {
  const mockUseInfiniteSwrPages = useInfiniteSwrPages as jest.Mock;
  const mockGetUserMediaPageForReelPicker =
    getUserMediaPageForReelPicker as jest.Mock;

  beforeEach(() => {
    mockUseInfiniteSwrPages.mockReset();
    mockGetUserMediaPageForReelPicker.mockReset();
    mockUseInfiniteSwrPages.mockReturnValue({
      items: [{ id: "item-1" }],
      errorMessage: null,
      isInitialLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMoreRef: jest.fn(),
      retry: jest.fn()
    });
  });

  it("delegates to the shared pagination hook with nested scroll observer options", () => {
    const scrollRoot = document.createElement("div");

    const { result } = renderHook(() =>
      useUserMediaReelPickerInfinite({
        enabled: true,
        scrollRoot
      })
    );

    expect(result.current.items).toEqual([{ id: "item-1" }]);
    expect(mockUseInfiniteSwrPages).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        observer: {
          root: scrollRoot,
          rootMargin: "200px"
        },
        swr: {
          revalidateFirstPage: false,
          dedupingInterval: 2000
        }
      })
    );
  });

  it("builds cursor keys that stop when the previous page has no more items", () => {
    renderHook(() =>
      useUserMediaReelPickerInfinite({
        enabled: true,
        scrollRoot: document.createElement("div")
      })
    );

    const options = mockUseInfiniteSwrPages.mock.calls[0]?.[0];

    expect(options.getKey(0, null)).toEqual(["user-media-reel-picker", null]);
    expect(
      options.getKey(1, {
        items: [],
        hasMore: true,
        nextCursor: "cursor-2"
      })
    ).toEqual(["user-media-reel-picker", "cursor-2"]);
    expect(
      options.getKey(1, {
        items: [],
        hasMore: false,
        nextCursor: "cursor-3"
      })
    ).toBeNull();
  });

  it("fetches the next reel-picker page with the expected limit and cursor", async () => {
    mockGetUserMediaPageForReelPicker.mockResolvedValue({
      items: [],
      hasMore: true,
      nextCursor: "cursor-4"
    });

    renderHook(() =>
      useUserMediaReelPickerInfinite({
        enabled: true,
        scrollRoot: document.createElement("div")
      })
    );

    const options = mockUseInfiniteSwrPages.mock.calls[0]?.[0];

    await act(async () => {
      await options.fetcher(["user-media-reel-picker", "cursor-1"]);
    });

    expect(mockGetUserMediaPageForReelPicker).toHaveBeenCalledWith({
      limit: 6,
      cursor: "cursor-1"
    });
  });
});

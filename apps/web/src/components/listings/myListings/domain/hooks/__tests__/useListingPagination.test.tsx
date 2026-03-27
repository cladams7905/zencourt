import { act, renderHook } from "@testing-library/react";
import { useInfiniteSwrPages } from "@web/src/components/shared/pagination";
import { buildListingsPageUrl } from "@web/src/components/listings/myListings/domain/services";
import { useListingPagination } from "@web/src/components/listings/myListings/domain/hooks/useListingPagination";

jest.mock("@web/src/components/shared/pagination", () => ({
  useInfiniteSwrPages: jest.fn()
}));

describe("useListingPagination", () => {
  const mockUseInfiniteSwrPages = useInfiniteSwrPages as jest.Mock;

  beforeEach(() => {
    mockUseInfiniteSwrPages.mockReset();
    mockUseInfiniteSwrPages.mockReturnValue({
      items: [
        {
          id: "listing-1",
          title: "One",
          listingStage: "categorize",
          lastOpenedAt: null,
          imageCount: 0,
          previewImages: []
        },
        {
          id: "listing-2",
          title: "Two",
          listingStage: "review",
          lastOpenedAt: null,
          imageCount: 0,
          previewImages: []
        }
      ],
      hasMore: false,
      isLoadingMore: false,
      errorMessage: null,
      loadMoreRef: jest.fn(),
      fetchMore: jest.fn()
    });
  });

  it("delegates to the shared pagination hook with initial listings merged in", () => {
    const initialListings = [
      {
        id: "listing-1",
        title: "One",
        listingStage: "categorize",
        lastOpenedAt: null,
        imageCount: 0,
        previewImages: []
      }
    ];

    const { result } = renderHook(() =>
      useListingPagination({
        initialListings,
        initialHasMore: true
      })
    );

    expect(result.current.listings).toEqual([
      expect.objectContaining({ id: "listing-1" }),
      expect.objectContaining({ id: "listing-2" })
    ]);
    expect(mockUseInfiniteSwrPages).toHaveBeenCalledWith(
      expect.objectContaining({
        initialItems: initialListings,
        initialHasMore: true
      })
    );
  });

  it("starts the first client page after the server-rendered listings", () => {
    renderHook(() =>
      useListingPagination({
        initialListings: [
          {
            id: "listing-1",
            title: "One",
            listingStage: "categorize",
            lastOpenedAt: null,
            imageCount: 0,
            previewImages: []
          }
        ],
        initialHasMore: true
      })
    );

    const options = mockUseInfiniteSwrPages.mock.calls[0]?.[0];

    expect(options.getKey(0, null)).toBe(
      buildListingsPageUrl({ offset: 1, limit: 10 })
    );
    expect(options.getKey(1, { hasMore: false })).toBeNull();
  });

  it("delegates fetchMoreListings to the shared pagination hook", async () => {
    const fetchMore = jest.fn();
    mockUseInfiniteSwrPages.mockReturnValue({
      items: [],
      hasMore: true,
      isLoadingMore: false,
      errorMessage: "Failed to load more listings.",
      loadMoreRef: jest.fn(),
      fetchMore
    });

    const { result } = renderHook(() =>
      useListingPagination({
        initialListings: [],
        initialHasMore: true
      })
    );

    await act(async () => {
      await result.current.fetchMoreListings();
    });

    expect(fetchMore).toHaveBeenCalled();
    expect(result.current.loadError).toBe("Failed to load more listings.");
  });
});

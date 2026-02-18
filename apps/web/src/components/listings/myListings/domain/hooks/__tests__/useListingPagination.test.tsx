import { act, renderHook } from "@testing-library/react";
import { useListingPagination } from "@web/src/components/listings/myListings/domain/hooks/useListingPagination";

describe("useListingPagination", () => {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    (global.fetch as unknown as jest.Mock).mockReset();
  });

  it("loads next page when fetchMoreListings runs", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: "listing-2",
            title: "Two",
            listingStage: "review",
            lastOpenedAt: null,
            imageCount: 0,
            previewImages: []
          }
        ],
        hasMore: false
      })
    });

    const { result } = renderHook(() =>
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

    await act(async () => {
      await result.current.fetchMoreListings();
    });

    expect(result.current.listings).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  it("sets load error when page fetch fails", async () => {
    (global.fetch as unknown as jest.Mock).mockResolvedValue({
      ok: false
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

    expect(result.current.loadError).toBe("Failed to load more listings.");
    expect(result.current.isLoadingMore).toBe(false);
  });
});

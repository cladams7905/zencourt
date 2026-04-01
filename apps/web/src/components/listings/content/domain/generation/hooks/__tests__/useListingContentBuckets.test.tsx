import * as React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useListingContentBuckets } from "../useListingContentBuckets";
import { LISTING_CONTENT_INITIAL_PAGE_SIZE } from "@web/src/components/listings/content/shared/constants";
import { buildFilterKey } from "../../../data/filterBuckets";
import { fetchListingContentItemsPageCached } from "../../../data/transport";
import type { ListingContentItem } from "@web/src/lib/domain/listings/content";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn()
  }
}));

jest.mock("../../../data/transport", () => ({
  fetchListingContentItemsPageCached: jest.fn()
}));

function makeItem(id: string, overrides: Partial<ListingContentItem> = {}): ListingContentItem {
  return {
    id,
    mediaType: "video",
    listingSubcategory: "new_listing",
    hook: `Hook ${id}`,
    caption: `Caption ${id}`,
    body: [],
    ...overrides
  };
}

type HookProps = {
  listingId: string;
  listingContentItems: ListingContentItem[];
  initialServerFilterKey: string;
  currentFilterKey: string;
  activeMediaTab: "videos" | "images";
  activeSubcategory:
    | "new_listing"
    | "open_house"
    | "price_change"
    | "status_update"
    | "property_features";
  activeGeneratingFilterKeyRef: React.MutableRefObject<string | null>;
  activeControllerRef: React.MutableRefObject<AbortController | null>;
};

function buildHookProps(overrides: Partial<HookProps> = {}): HookProps {
  const activeGeneratingFilterKeyRef = { current: null as string | null };
  const activeControllerRef = { current: null as AbortController | null };

  return {
    listingId: "listing-1",
    listingContentItems: [makeItem("initial-1")],
    initialServerFilterKey: buildFilterKey("videos", "new_listing"),
    currentFilterKey: buildFilterKey("videos", "new_listing"),
    activeMediaTab: "videos" as const,
    activeSubcategory: "new_listing" as const,
    activeGeneratingFilterKeyRef,
    activeControllerRef,
    ...overrides
  };
}

describe("useListingContentBuckets", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetchListingContentItemsPageCached as jest.Mock).mockResolvedValue({
      items: [],
      hasMore: false,
      nextOffset: 0
    });
  });

  it("seeds the current bucket from server items and resyncs when items change", async () => {
    const initialProps = buildHookProps();
    const { result, rerender } = renderHook(
      (props: HookProps) => useListingContentBuckets(props),
      { initialProps }
    );

    expect(result.current.currentBucket.items.map((item) => item.id)).toEqual([
      "initial-1"
    ]);
    expect(result.current.currentBucket.hasFetchedInitialPage).toBe(true);
    expect(result.current.currentBucket.hasMore).toBe(false);

    rerender(
      buildHookProps({
        listingContentItems: Array.from(
          { length: LISTING_CONTENT_INITIAL_PAGE_SIZE },
          (_, index) => makeItem(`next-${index + 1}`)
        )
      })
    );

    await waitFor(() => {
      expect(result.current.currentBucket.items).toHaveLength(
        LISTING_CONTENT_INITIAL_PAGE_SIZE
      );
    });
    expect(result.current.currentBucket.hasMore).toBe(true);
    expect(result.current.currentBucket.offset).toBe(
      LISTING_CONTENT_INITIAL_PAGE_SIZE
    );
  });

  it("fetches the first page for an uncached filter and dedupes in-flight warmups", async () => {
    let resolvePage!: (value: {
      items: ListingContentItem[];
      hasMore: boolean;
      nextOffset: number;
    }) => void;
    const pagePromise = new Promise<{
      items: ListingContentItem[];
      hasMore: boolean;
      nextOffset: number;
    }>((resolve) => {
      resolvePage = resolve;
    });

    (fetchListingContentItemsPageCached as jest.Mock).mockReturnValue(pagePromise);

    const props = buildHookProps({
      currentFilterKey: buildFilterKey("images", "open_house"),
      activeMediaTab: "images",
      activeSubcategory: "open_house"
    });
    const { result } = renderHook(() => useListingContentBuckets(props));

    await waitFor(() => {
      expect(fetchListingContentItemsPageCached).toHaveBeenCalledTimes(1);
    });

    const promiseA = result.current.fetchFirstPageForFilter("images", "open_house");
    const promiseB = result.current.fetchFirstPageForFilter("images", "open_house");

    expect(fetchListingContentItemsPageCached).toHaveBeenCalledTimes(1);

    resolvePage({
      items: [makeItem("fetched-1", { mediaType: "image", listingSubcategory: "open_house" })],
      hasMore: true,
      nextOffset: 1
    });

    await act(async () => {
      await Promise.all([promiseA, promiseB]);
    });

    await waitFor(() => {
      expect(result.current.currentBucket.items.map((item) => item.id)).toEqual([
        "fetched-1"
      ]);
    });
    expect(result.current.currentBucket.hasFetchedInitialPage).toBe(true);
    expect(result.current.currentBucket.isLoadingInitialPage).toBe(false);
    expect(result.current.currentBucket.hasMore).toBe(true);
  });

  it("loads more items for the active filter and appends only new ids", async () => {
    const props = buildHookProps({
      listingContentItems: Array.from(
        { length: LISTING_CONTENT_INITIAL_PAGE_SIZE },
        (_, index) => makeItem(`initial-${index + 1}`, { listingSubcategory: "price_change" })
      ),
      initialServerFilterKey: buildFilterKey("videos", "price_change"),
      currentFilterKey: buildFilterKey("videos", "price_change"),
      activeSubcategory: "price_change"
    });
    const { result } = renderHook(() => useListingContentBuckets(props));

    (fetchListingContentItemsPageCached as jest.Mock).mockResolvedValueOnce({
      items: [
        makeItem("initial-3", { listingSubcategory: "price_change" }),
        makeItem("next-9", { listingSubcategory: "price_change" }),
        makeItem("next-10", { listingSubcategory: "price_change" })
      ],
      hasMore: false,
      nextOffset: 10
    });

    await act(async () => {
      await result.current.loadMoreForActiveFilter();
    });

    expect(result.current.currentBucket.items.slice(-2).map((item) => item.id)).toEqual([
      "next-9",
      "next-10"
    ]);
    expect(result.current.currentBucket.hasMore).toBe(false);
    expect(result.current.currentBucket.offset).toBe(10);
  });

  it("does not load more while the current filter is actively generating", async () => {
    const activeGeneratingFilterKeyRef = {
      current: buildFilterKey("videos", "new_listing")
    };
    const props = buildHookProps({
      listingContentItems: Array.from(
        { length: LISTING_CONTENT_INITIAL_PAGE_SIZE },
        (_, index) => makeItem(`initial-${index + 1}`)
      ),
      activeGeneratingFilterKeyRef
    });

    const { result } = renderHook(() => useListingContentBuckets(props));

    await act(async () => {
      await result.current.loadMoreForActiveFilter();
    });

    expect(fetchListingContentItemsPageCached).not.toHaveBeenCalled();
  });

  it("shows a toast and clears loading-more state when loading another page fails", async () => {
    const props = buildHookProps({
      listingContentItems: Array.from(
        { length: LISTING_CONTENT_INITIAL_PAGE_SIZE },
        (_, index) => makeItem(`initial-${index + 1}`, { listingSubcategory: "status_update" })
      ),
      initialServerFilterKey: buildFilterKey("videos", "status_update"),
      currentFilterKey: buildFilterKey("videos", "status_update"),
      activeSubcategory: "status_update"
    });

    (fetchListingContentItemsPageCached as jest.Mock)
      .mockRejectedValueOnce(new Error("network"));

    const { result } = renderHook(() => useListingContentBuckets(props));

    await act(async () => {
      await result.current.loadMoreForActiveFilter();
    });

    expect(toast.error).toHaveBeenCalledWith("Failed to load more content.");
    expect(result.current.currentBucket.isLoadingMore).toBe(false);
    expect(result.current.currentBucket.items).toHaveLength(
      LISTING_CONTENT_INITIAL_PAGE_SIZE
    );
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { useContentGeneration } from "@web/src/components/listings/create/domain/contentGeneration/useContentGeneration";
import { GENERATED_BATCH_SIZE } from "@web/src/components/listings/create/shared/constants";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";

const mockToastError = jest.fn();
const mockRequestStream = jest.fn();
const mockStreamEvents = jest.fn();
const mockExtractJsonItems = jest.fn();
const mockGetListingCreatePostItemsForCurrentUser = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock(
  "@web/src/components/listings/create/domain/contentGeneration/stream",
  () => ({
    requestContentGenerationStream: (...args: unknown[]) => mockRequestStream(...args),
    streamContentGenerationEvents: (...args: unknown[]) => mockStreamEvents(...args)
  })
);

jest.mock("@web/src/lib/sse/contentExtractor", () => ({
  extractJsonItemsFromStream: (...args: unknown[]) => mockExtractJsonItems(...args)
}));

jest.mock("@web/src/server/actions/listings/createPostItems", () => ({
  getListingCreatePostItemsForCurrentUser: (...args: unknown[]) =>
    mockGetListingCreatePostItemsForCurrentUser(...args)
}));

function eventsGenerator(events: Array<unknown | Promise<unknown>>) {
  return (async function* () {
    for (const event of events) {
      yield await event;
    }
  })();
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("useContentGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestStream.mockResolvedValue({} as ReadableStreamDefaultReader<Uint8Array>);
    mockExtractJsonItems.mockReturnValue([]);
    mockGetListingCreatePostItemsForCurrentUser.mockResolvedValue([]);
  });

  it("handles successful generation flow", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        {
          type: "done",
          items: [
            { hook: "H1", caption: "C1" },
            { hook: "H2", caption: "C2" },
            { hook: "H3", caption: "C3" },
            { hook: "H4", caption: "C4" }
          ]
        }
      ])
    );

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing");
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.generationError).toBeNull();
    expect(result.current.loadingCount).toBe(0);
    expect(result.current.localPostItems).toHaveLength(4);
  });

  it("reports partial done payload as retryable error and keeps missing skeleton count", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        {
          type: "done",
          items: [{ hook: "H1" }, { hook: "H2" }]
        }
      ])
    );

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "images",
        initialSubcategory: "new_listing",
        activeMediaTab: "images",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing");
    });

    expect(result.current.localPostItems).toHaveLength(2);
    expect(result.current.loadingCount).toBe(GENERATED_BATCH_SIZE - 2);
    expect(result.current.generationError).toBe(
      "sorry, an error occurred. Please retry."
    );
    expect(mockToastError).toHaveBeenCalledWith(
      "Sorry, an error occurred. Please retry."
    );
  });

  it("handles stream finishing without done event", async () => {
    mockStreamEvents.mockReturnValue(eventsGenerator([]));

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [{ id: "existing-1" }],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing");
    });

    expect(result.current.localPostItems).toEqual([{ id: "existing-1" }]);
    expect(result.current.generationError).toBe(
      "Stream ended before completing output."
    );
    expect(result.current.loadingCount).toBe(GENERATED_BATCH_SIZE);
  });

  it("handles abort errors without setting generation error", async () => {
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    mockRequestStream.mockRejectedValue(abortError);

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing");
    });

    expect(result.current.generationError).toBeNull();
    expect(result.current.loadingCount).toBe(0);
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("passes generation nonce when forceNewBatch is true", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([{ type: "done", items: [{ hook: "H1" }, { hook: "H2" }, { hook: "H3" }, { hook: "H4" }] }])
    );

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing", {
        forceNewBatch: true
      });
    });

    await waitFor(() => {
      expect(mockRequestStream).toHaveBeenCalled();
    });
    const firstCall = mockRequestStream.mock.calls[0]?.[0] as {
      generationNonce: string;
    };
    expect(firstCall.generationNonce).toBeTruthy();
  });

  it("re-syncs local post items when server props update for same listing", () => {
    const { result, rerender } = renderHook(
      (props: { listingPostItems: Array<{ id: string }> }) =>
        useContentGeneration({
          listingId: "listing-1",
          listingPostItems: props.listingPostItems,
          initialMediaTab: "images",
          initialSubcategory: "new_listing",
          activeMediaTab: "images",
          activeSubcategory: "new_listing",
          videoItems: []
        }),
      {
        initialProps: {
          listingPostItems: [{ id: "cached-new-listing-1" }]
        }
      }
    );

    expect(result.current.localPostItems).toEqual([
      { id: "cached-new-listing-1" }
    ]);

    rerender({
      listingPostItems: [{ id: "cached-open-house-1" }]
    });

    expect(result.current.localPostItems).toEqual([
      { id: "cached-open-house-1" }
    ]);
  });

  it("warms current-media siblings before warming the opposite media tab", async () => {
    const siblingSubcategories = LISTING_CONTENT_SUBCATEGORIES.filter(
      (subcategory) => subcategory !== "new_listing"
    );
    const siblingDeferreds = new Map(
      siblingSubcategories.map((subcategory) => [subcategory, createDeferred<unknown[]>()])
    );

    mockGetListingCreatePostItemsForCurrentUser.mockImplementation(
      async (_listingId: string, params: { mediaTab?: string; subcategory?: string }) => {
        if (params.mediaTab === "videos" && params.subcategory && params.subcategory !== "new_listing") {
          return (
            siblingDeferreds.get(
              params.subcategory as (typeof siblingSubcategories)[number]
            )?.promise ?? []
          );
        }
        return [];
      }
    );

    renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [{ id: "cached-new-listing-1", listingSubcategory: "new_listing", mediaType: "video" } as never],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    await waitFor(() => {
      expect(mockGetListingCreatePostItemsForCurrentUser).toHaveBeenCalledTimes(
        siblingSubcategories.length
      );
    });

    expect(
      mockGetListingCreatePostItemsForCurrentUser.mock.calls.every(
        ([, params]) => params.mediaTab === "videos"
      )
    ).toBe(true);

    await act(async () => {
      siblingSubcategories.forEach((subcategory) => {
        siblingDeferreds.get(subcategory)?.resolve([]);
      });
    });

    await waitFor(() => {
      expect(
        mockGetListingCreatePostItemsForCurrentUser.mock.calls.some(
          ([, params]) => params.mediaTab === "images"
        )
      ).toBe(true);
    });
  });

  it("shows eight skeletons when switching to a warming bucket with no items yet", async () => {
    const openHouseDeferred = createDeferred<Array<{ id: string }>>();
    mockGetListingCreatePostItemsForCurrentUser.mockImplementation(
      async (_listingId: string, params: { mediaTab?: string; subcategory?: string }) => {
        if (params.mediaTab === "videos" && params.subcategory === "open_house") {
          return openHouseDeferred.promise;
        }
        return [];
      }
    );

    const { result, rerender } = renderHook(
      (props: { activeSubcategory: "new_listing" | "open_house" }) =>
        useContentGeneration({
          listingId: "listing-1",
          listingPostItems: [{ id: "cached-new-listing-1", listingSubcategory: "new_listing", mediaType: "video" } as never],
          initialMediaTab: "videos",
          initialSubcategory: "new_listing",
          activeMediaTab: "videos",
          activeSubcategory: props.activeSubcategory,
          videoItems: []
        }),
      {
        initialProps: {
          activeSubcategory: "new_listing" as "new_listing" | "open_house"
        }
      }
    );

    rerender({
      activeSubcategory: "open_house"
    });

    await waitFor(() => {
      expect(mockGetListingCreatePostItemsForCurrentUser).toHaveBeenCalledWith(
        "listing-1",
        expect.objectContaining({
          mediaTab: "videos",
          subcategory: "open_house"
        })
      );
    });

    await waitFor(() => {
      expect(result.current.initialPageLoadingCount).toBe(8);
    });
    expect(result.current.localPostItems).toEqual([]);

    await act(async () => {
      openHouseDeferred.resolve([{ id: "cached-open-house-1" }]);
    });

    await waitFor(() => {
      expect(result.current.initialPageLoadingCount).toBe(0);
    });
    expect(result.current.localPostItems).toEqual([{ id: "cached-open-house-1" }]);
  });

  it("keeps initial ordered clip ids and duration overrides for generated cached video reels without client cache writes", async () => {
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        {
          type: "done",
          items: [{ hook: "Hook", caption: "Caption" }],
          meta: { cache_key_timestamp: 123 }
        }
      ])
    );

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: [
          {
            id: "clip-1",
            videoUrl: "https://example.com/1.mp4",
            durationSeconds: 3,
            category: "kitchen"
          },
          {
            id: "clip-2",
            videoUrl: "https://example.com/2.mp4",
            durationSeconds: 4,
            category: "exterior"
          }
        ] as never
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing");
    });

    const generatedItem = result.current.localPostItems[0] as {
      orderedClipIds?: string[];
      clipDurationOverrides?: Record<string, number>;
    };

    expect(generatedItem.orderedClipIds).toBeDefined();
    expect(generatedItem.orderedClipIds).toHaveLength(2);
    expect(generatedItem.clipDurationOverrides).toEqual(
      expect.objectContaining({
        [generatedItem.orderedClipIds![0]!]: expect.any(Number),
        [generatedItem.orderedClipIds![1]!]: expect.any(Number)
      })
    );
  });

  it("applies cache identity to streamed video items before the final done event", async () => {
    mockExtractJsonItems.mockReturnValueOnce([{ hook: "Hook", caption: "Caption" }]);
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        {
          type: "meta",
          meta: { cache_key_timestamp: 123 }
        },
        {
          type: "delta",
          text: '[{"hook":"Hook","caption":"Caption"}'
        }
      ])
    );

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: [
          {
            id: "clip-1",
            videoUrl: "https://example.com/1.mp4",
            durationSeconds: 3,
            category: "kitchen"
          },
          {
            id: "clip-2",
            videoUrl: "https://example.com/2.mp4",
            durationSeconds: 4,
            category: "exterior"
          }
        ] as never
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing");
    });

    expect(result.current.localPostItems[0]).toEqual(
      expect.objectContaining({
        cacheKeyTimestamp: 123,
        cacheKeyId: 0
      })
    );
  });

  it("reduces loading skeleton count as streamed reel items become visible", async () => {
    mockExtractJsonItems.mockReturnValueOnce([
      { hook: "Hook 1", caption: "Caption 1" }
    ]);
    let releaseDone!: () => void;
    const holdDone = new Promise<void>((resolve) => {
      releaseDone = resolve;
    });
    mockStreamEvents.mockReturnValue(
      eventsGenerator([
        {
          type: "meta",
          meta: { cache_key_timestamp: 123 }
        },
        {
          type: "delta",
          text: '[{"hook":"Hook 1","caption":"Caption 1"}'
        },
        holdDone.then(() => ({
          type: "done" as const,
          items: [{ hook: "Hook 1", caption: "Caption 1" }],
          meta: { cache_key_timestamp: 123 }
        }))
      ])
    );

    const { result } = renderHook(() =>
      useContentGeneration({
        listingId: "listing-1",
        listingPostItems: [],
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        videoItems: []
      })
    );

    let generationPromise: Promise<void>;
    act(() => {
      generationPromise = result.current.generateSubcategoryContent("new_listing", {
        generationCount: 4
      });
    });

    await waitFor(() => {
      expect(result.current.localPostItems).toHaveLength(1);
    });

    expect(result.current.loadingCount).toBe(3);

    releaseDone();
    await act(async () => {
      await generationPromise;
    });
  });

});

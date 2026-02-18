import { act, renderHook, waitFor } from "@testing-library/react";
import { useContentGeneration } from "@web/src/components/listings/create/domain/hooks/useContentGeneration";
import { GENERATED_BATCH_SIZE } from "@web/src/components/listings/create/shared/constants";

const mockToastError = jest.fn();
const mockRequestStream = jest.fn();
const mockStreamEvents = jest.fn();
const mockExtractJsonItems = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock(
  "@web/src/components/listings/create/domain/contentGenerationStream",
  () => ({
    requestContentGenerationStream: (...args: unknown[]) => mockRequestStream(...args),
    streamContentGenerationEvents: (...args: unknown[]) => mockStreamEvents(...args)
  })
);

jest.mock("@web/src/lib/parsing/stream/extractJsonItemsFromStream", () => ({
  extractJsonItemsFromStream: (...args: unknown[]) => mockExtractJsonItems(...args)
}));

function eventsGenerator(events: unknown[]) {
  return (async function* () {
    for (const event of events) {
      yield event;
    }
  })();
}

describe("useContentGeneration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequestStream.mockResolvedValue({} as ReadableStreamDefaultReader<Uint8Array>);
    mockExtractJsonItems.mockReturnValue([]);
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
        activeMediaTab: "videos",
        activeSubcategory: "new_listing"
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
        activeMediaTab: "images",
        activeSubcategory: "new_listing"
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
        activeMediaTab: "videos",
        activeSubcategory: "new_listing"
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
        activeMediaTab: "videos",
        activeSubcategory: "new_listing"
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
        activeMediaTab: "videos",
        activeSubcategory: "new_listing"
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
});

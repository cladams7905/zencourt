import { act, renderHook, waitFor } from "@testing-library/react";
import { useTemplateRender } from "@web/src/components/listings/create/domain/templateRender/useTemplateRender";

const mockBuildTemplateRenderCaptionItems = jest.fn();
const mockMapSingleTemplateRenderItemToPreviewItem = jest.fn();
const mockStreamEvents: Array<{ type: "item"; item: unknown } | { type: "done"; failedTemplateIds: string[] } | { type: "error"; message: string }> = [];
const mockStreamEventBatches: Array<
  Array<
    | { type: "item"; item: unknown }
    | { type: "done"; failedTemplateIds: string[] }
    | { type: "error"; message: string }
  >
> = [];

jest.mock("@web/src/components/listings/create/domain/listingCreateUtils", () => ({
  buildTemplateRenderCaptionItems: (...args: unknown[]) =>
    mockBuildTemplateRenderCaptionItems(...args),
  getCachedPreviewsFromCaptionItems: () => [],
  mapSingleTemplateRenderItemToPreviewItem: (...args: unknown[]) =>
    mockMapSingleTemplateRenderItemToPreviewItem(...args)
}));

jest.mock("@web/src/components/listings/create/domain/templateRender/streamEvents", () => ({
  streamTemplateRenderEvents: async function* () {
    const events =
      mockStreamEventBatches.length > 0
        ? mockStreamEventBatches.shift() ?? []
        : mockStreamEvents;
    for (const event of events) {
      yield event;
    }
  }
}));

describe("useTemplateRender", () => {
  const stableCaptionItems = [{ id: "a" }];

  beforeEach(() => {
    jest.clearAllMocks();
    mockStreamEvents.length = 0;
    mockStreamEventBatches.length = 0;
    mockBuildTemplateRenderCaptionItems.mockReturnValue([]);
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: jest.fn()
    });
  });

  it("resets when media tab is not images", () => {
    const { result } = renderHook(() =>
      useTemplateRender({
        listingId: "listing-1",
        activeSubcategory: "new_listing",
        activeMediaTab: "videos",
        captionItems: stableCaptionItems,
        isGenerating: false
      })
    );

    expect(result.current.previewItems).toEqual([]);
    expect(result.current.isRendering).toBe(false);
    expect(result.current.renderError).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch when caption items sanitize to empty", () => {
    mockBuildTemplateRenderCaptionItems.mockReturnValue([]);

    const { result } = renderHook(() =>
      useTemplateRender({
        listingId: "listing-1",
        activeSubcategory: "new_listing",
        activeMediaTab: "images",
        captionItems: stableCaptionItems,
        isGenerating: false
      })
    );

    expect(result.current.previewItems).toEqual([]);
    expect(result.current.renderError).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("maps successful render result", async () => {
    mockBuildTemplateRenderCaptionItems.mockReturnValue([
      { id: "cap-1", hook: "h", caption: null, body: [] }
    ]);
    mockMapSingleTemplateRenderItemToPreviewItem.mockReturnValue({
      id: "preview-1",
      variationNumber: 1,
      hook: "h",
      caption: null,
      slides: [],
      coverImageUrl: "u1",
      captionItemId: "cap-1"
    });
    mockStreamEvents.length = 0;
    mockStreamEvents.push({
      type: "item",
      item: { templateId: "t1", imageUrl: "u1", captionItemId: "cap-1", parametersUsed: {} }
    });
    mockStreamEvents.push({ type: "done", failedTemplateIds: [] });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }) }) }
    });

    const { result } = renderHook(() =>
      useTemplateRender({
        listingId: "listing-1",
        activeSubcategory: "new_listing",
        activeMediaTab: "images",
        captionItems: stableCaptionItems,
        isGenerating: false
      })
    );

    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });
    expect(result.current.previewItems).toHaveLength(1);
    expect(result.current.renderError).toBeNull();
  });

  it("surfaces fallback error when templates fail", async () => {
    mockBuildTemplateRenderCaptionItems.mockReturnValue([
      { id: "cap-1", hook: "h", caption: null, body: [] }
    ]);
    mockStreamEvents.length = 0;
    mockStreamEvents.push({ type: "done", failedTemplateIds: ["tpl-1"] });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: { getReader: () => ({ read: () => Promise.resolve({ done: true, value: undefined }) }) }
    });

    const { result } = renderHook(() =>
      useTemplateRender({
        listingId: "listing-1",
        activeSubcategory: "new_listing",
        activeMediaTab: "images",
        captionItems: stableCaptionItems,
        isGenerating: false
      })
    );

    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });
    expect(result.current.renderError).toBe(
      "Failed to render templates. Showing fallback."
    );
  });

  it("disables template rendering after provider configuration error", async () => {
    mockBuildTemplateRenderCaptionItems.mockReturnValue([
      { id: "cap-1", hook: "h", caption: null, body: [] }
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ message: "API key must be configured" })
    });

    const { result, rerender } = renderHook(
      ({ listingId }) =>
        useTemplateRender({
          listingId,
          activeSubcategory: "new_listing",
          activeMediaTab: "images",
          captionItems: stableCaptionItems,
          isGenerating: false
        }),
      { initialProps: { listingId: "listing-1" } }
    );

    await waitFor(() => {
      expect(result.current.isRendering).toBe(false);
    });
    rerender({ listingId: "listing-1" });
    await waitFor(() => {
      expect(result.current.renderError).toBe(
        "Template rendering is unavailable. Showing fallback."
      );
    });
  });

  it("ignores aborted request errors", async () => {
    mockBuildTemplateRenderCaptionItems.mockReturnValue([
      { id: "cap-1", hook: "h", caption: null, body: [] }
    ]);
    const abortError = new Error("aborted");
    abortError.name = "AbortError";
    (global.fetch as jest.Mock).mockRejectedValue(abortError);

    const { result } = renderHook(() =>
      useTemplateRender({
        listingId: "listing-1",
        activeSubcategory: "new_listing",
        activeMediaTab: "images",
        captionItems: stableCaptionItems,
        isGenerating: false
      })
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.renderError).toBeNull();
    expect(result.current.previewItems).toEqual([]);
  });

  it("removes stale streamed previews when a caption item is deleted", async () => {
    mockBuildTemplateRenderCaptionItems.mockImplementation((items: { id: string }[]) =>
      items.map((item) => ({ id: item.id, hook: "h", caption: null, body: [] }))
    );
    mockMapSingleTemplateRenderItemToPreviewItem.mockImplementation(
      ({ renderedItem }: { renderedItem: { captionItemId: string; imageUrl: string } }) => ({
        id: `preview-${renderedItem.captionItemId}`,
        variationNumber: 1,
        hook: "h",
        caption: null,
        slides: [],
        coverImageUrl: renderedItem.imageUrl,
        captionItemId: renderedItem.captionItemId
      })
    );
    mockStreamEventBatches.push(
      [
        {
          type: "item",
          item: {
            templateId: "t1",
            imageUrl: "u1",
            captionItemId: "a",
            parametersUsed: {}
          }
        },
        { type: "done", failedTemplateIds: [] }
      ],
      [{ type: "done", failedTemplateIds: [] }]
    );
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      body: {
        getReader: () => ({
          read: () => Promise.resolve({ done: true, value: undefined })
        })
      }
    });

    const { result, rerender } = renderHook(
      ({ captionItems }) =>
        useTemplateRender({
          listingId: "listing-1",
          activeSubcategory: "new_listing",
          activeMediaTab: "images",
          captionItems,
          isGenerating: false
        }),
      {
        initialProps: { captionItems: [{ id: "a" }, { id: "b" }] }
      }
    );

    await waitFor(() => {
      expect(result.current.previewItems.some((item) => item.captionItemId === "a")).toBe(true);
    });

    rerender({ captionItems: [{ id: "b" }] });

    await waitFor(() => {
      expect(result.current.previewItems.some((item) => item.captionItemId === "a")).toBe(false);
    });
  });
});

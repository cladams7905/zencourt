import { act, renderHook, waitFor } from "@testing-library/react";
import { useTemplateRender } from "@web/src/components/listings/create/domain/hooks/useTemplateRender";

const mockBuildTemplateRenderCaptionItems = jest.fn();
const mockMapTemplateRenderItemsToPreviewItems = jest.fn();

jest.mock("@web/src/components/listings/create/domain/listingCreateUtils", () => ({
  buildTemplateRenderCaptionItems: (...args: unknown[]) =>
    mockBuildTemplateRenderCaptionItems(...args),
  mapTemplateRenderItemsToPreviewItems: (...args: unknown[]) =>
    mockMapTemplateRenderItemsToPreviewItems(...args)
}));

describe("useTemplateRender", () => {
  const stableCaptionItems = [{ id: "a" }];

  beforeEach(() => {
    jest.clearAllMocks();
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
    mockBuildTemplateRenderCaptionItems.mockReturnValue([{ id: "cap-1", hook: "h", caption: null, body: [] }]);
    mockMapTemplateRenderItemsToPreviewItems.mockReturnValue([
      {
        id: "preview-1",
        variationNumber: 1,
        hook: "h",
        caption: null,
        slides: [],
        coverImageUrl: "u1"
      }
    ]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ templateId: "t1" }], failedTemplateIds: [] })
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
    mockBuildTemplateRenderCaptionItems.mockReturnValue([{ id: "cap-1", hook: "h", caption: null, body: [] }]);
    mockMapTemplateRenderItemsToPreviewItems.mockReturnValue([]);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ items: [], failedTemplateIds: ["tpl-1"] })
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
    mockBuildTemplateRenderCaptionItems.mockReturnValue([{ id: "cap-1", hook: "h", caption: null, body: [] }]);
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
    mockBuildTemplateRenderCaptionItems.mockReturnValue([{ id: "cap-1", hook: "h", caption: null, body: [] }]);
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
});

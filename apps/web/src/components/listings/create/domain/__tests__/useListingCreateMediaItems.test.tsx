import { renderHook } from "@testing-library/react";
import { useListingCreateMediaItems } from "@web/src/components/listings/create/domain/useListingCreateMediaItems";

describe("useListingCreateMediaItems", () => {
  it("falls back to generated image previews when template rendering is unavailable", () => {
    const { result } = renderHook(() =>
      useListingCreateMediaItems({
        activeMediaTab: "images",
        activeMediaItems: [
          {
            id: "item-1",
            hook: "Hook",
            caption: "Caption",
            body: [{ header: "H", content: "C" }]
          }
        ] as never,
        listingImages: [
          {
            id: "img-1",
            url: "https://example.com/1.jpg",
            category: "kitchen",
            uploadedAtMs: 1,
            isPrimary: true,
            primaryScore: 0.9
          }
        ],
        isGenerating: false,
        loadingCount: 0,
        isTemplateRendering: false,
        isTemplateRenderingUnavailable: true,
        templatePreviewItems: []
      })
    );

    expect(result.current.activeImagePreviewItems).toHaveLength(1);
    expect(result.current.imageLoadingCount).toBe(0);
  });
});

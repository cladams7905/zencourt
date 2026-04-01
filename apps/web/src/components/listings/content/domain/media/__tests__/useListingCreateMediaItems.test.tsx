import { renderHook } from "@testing-library/react";
import { useListingContentMediaItems } from "../mediaItems";

describe("useListingContentMediaItems", () => {
  it("falls back to generated image previews when template rendering is unavailable", () => {
    const { result } = renderHook(() =>
      useListingContentMediaItems({
        activeMediaTab: "images",
        activeContentItems: [
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
            recommendationScore: 0.9,
            shotType: "room"
          }
        ],
        isGenerating: false,
        loadingCount: 0,
        initialPageLoadingCount: 0,
        loadingMoreCount: 0,
        isTemplateRendering: false,
        isTemplateRenderingUnavailable: true,
        templatePreviewItems: []
      })
    );

    expect(result.current.activeImagePreviewItems).toHaveLength(1);
    expect(result.current.imageLoadingCount).toBe(0);
  });

  it("uses template previews when template rendering is available", () => {
    const templatePreviewItems = [
      {
        id: "preview-1",
        variationNumber: 1,
        hook: "Template",
        caption: "Preview",
        slides: [{ id: "slide-1", imageUrl: "https://example.com/1.jpg", header: "H", content: "C" }],
        coverImageUrl: "https://example.com/1.jpg"
      }
    ];

    const { result } = renderHook(() =>
      useListingContentMediaItems({
        activeMediaTab: "images",
        activeContentItems: [{ id: "item-1" }] as never,
        listingImages: [],
        isGenerating: false,
        loadingCount: 0,
        initialPageLoadingCount: 0,
        loadingMoreCount: 0,
        isTemplateRendering: false,
        isTemplateRenderingUnavailable: false,
        templatePreviewItems: templatePreviewItems as never
      })
    );

    expect(result.current.activeImagePreviewItems).toEqual(templatePreviewItems);
    expect(result.current.imageLoadingCount).toBe(0);
  });

  it("builds fallback slides from item body and cycles images", () => {
    const { result } = renderHook(() =>
      useListingContentMediaItems({
        activeMediaTab: "images",
        activeContentItems: [
          {
            id: "item-1",
            hook: " Hook ",
            caption: " Caption ",
            body: [
              { header: " First ", content: " One " },
              { header: "", content: " Two " }
            ]
          }
        ] as never,
        listingImages: [
          {
            id: "img-1",
            url: "https://example.com/1.jpg",
            category: "kitchen",
            uploadedAtMs: 2,
            recommendationScore: 0.9,
            shotType: "room"
          },
          {
            id: "img-2",
            url: "https://example.com/2.jpg",
            category: "kitchen",
            uploadedAtMs: 1,
            recommendationScore: 0.8,
            shotType: "room"
          }
        ],
        isGenerating: false,
        loadingCount: 0,
        initialPageLoadingCount: 0,
        loadingMoreCount: 0,
        isTemplateRendering: false,
        isTemplateRenderingUnavailable: true,
        templatePreviewItems: []
      })
    );

    expect(result.current.activeImagePreviewItems[0]).toMatchObject({
      hook: "Hook",
      caption: "Caption"
    });
    expect(result.current.activeImagePreviewItems[0]?.slides).toHaveLength(2);
    expect(result.current.activeImagePreviewItems[0]?.slides[0]).toMatchObject({
      header: "First",
      content: "One"
    });
    expect(result.current.activeImagePreviewItems[0]?.slides[1]).toMatchObject({
      header: "Hook",
      content: "Two"
    });
  });

  it("derives loading count from initial page load, loading more, generation, and template expectations", () => {
    const { result, rerender } = renderHook(
      (props: Record<string, unknown>) =>
        useListingContentMediaItems(props as never),
      {
        initialProps: {
          activeMediaTab: "images",
          activeContentItems: [],
          listingImages: [],
          isGenerating: false,
          loadingCount: 0,
          initialPageLoadingCount: 3,
          loadingMoreCount: 0,
          isTemplateRendering: false,
          isTemplateRenderingUnavailable: false,
          templatePreviewItems: []
        }
      }
    );

    expect(result.current.imageLoadingCount).toBe(3);

    rerender({
      activeMediaTab: "images",
      activeContentItems: [{ id: "item-1" }],
      listingImages: [],
      isGenerating: false,
      loadingCount: 0,
      initialPageLoadingCount: 0,
      loadingMoreCount: 2,
      isTemplateRendering: false,
      isTemplateRenderingUnavailable: false,
      templatePreviewItems: []
    });
    expect(result.current.imageLoadingCount).toBe(2);

    rerender({
      activeMediaTab: "images",
      activeContentItems: [{ id: "item-1" }],
      listingImages: [],
      isGenerating: true,
      loadingCount: 4,
      initialPageLoadingCount: 0,
      loadingMoreCount: 0,
      isTemplateRendering: false,
      isTemplateRenderingUnavailable: false,
      templatePreviewItems: []
    });
    expect(result.current.imageLoadingCount).toBe(4);

    rerender({
      activeMediaTab: "images",
      activeContentItems: [{ id: "item-1" }, { id: "item-2" }],
      listingImages: [],
      isGenerating: false,
      loadingCount: 0,
      initialPageLoadingCount: 0,
      loadingMoreCount: 0,
      isTemplateRendering: true,
      isTemplateRenderingUnavailable: false,
      templatePreviewItems: [{ id: "preview-1" }]
    });
    expect(result.current.imageLoadingCount).toBe(1);
  });
});

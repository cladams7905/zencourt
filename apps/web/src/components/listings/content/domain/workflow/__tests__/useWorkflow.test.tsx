import { act, renderHook } from "@testing-library/react";
import { useListingContentWorkflow } from "../useWorkflow";

const mockUseContentGeneration = jest.fn();
const mockUseListingContentActiveMediaItems = jest.fn();
const mockUseTemplateRender = jest.fn();
const mockUseListingContentMediaItems = jest.fn();
const mockUseListingContentPreviewPlans = jest.fn();
const mockUseDeleteCachedPreviewItem = jest.fn();

jest.mock("@web/src/components/listings/content/domain/generation", () => ({
  useContentGeneration: (...args: unknown[]) =>
    mockUseContentGeneration(...args)
}));

jest.mock(
  "@web/src/components/listings/content/domain/media/activeMediaItems",
  () => ({
    useListingContentActiveMediaItems: (...args: unknown[]) =>
      mockUseListingContentActiveMediaItems(...args)
  })
);

jest.mock("@web/src/components/listings/content/image/domain/templateRender", () => ({
  useTemplateRender: (...args: unknown[]) => mockUseTemplateRender(...args)
}));

jest.mock(
  "@web/src/components/listings/content/domain/media/mediaItems",
  () => ({
    useListingContentMediaItems: (...args: unknown[]) =>
      mockUseListingContentMediaItems(...args)
  })
);

jest.mock("../usePreviewPlans", () => ({
  useListingContentPreviewPlans: (...args: unknown[]) =>
    mockUseListingContentPreviewPlans(...args)
}));

jest.mock(
  "@web/src/components/listings/content/domain/media/deleteCachedPreviewItem",
  () => ({
    useDeleteCachedPreviewItem: (...args: unknown[]) =>
      mockUseDeleteCachedPreviewItem(...args)
  })
);

describe("useListingContentWorkflow", () => {
  beforeEach(() => {
    jest.resetAllMocks();

    mockUseContentGeneration.mockReturnValue({
      bucketContentItems: [{ id: "content-1" }],
      isGenerating: false,
      generationError: null,
      loadingCount: 1,
      initialPageLoadingCount: 2,
      loadingMoreCount: 3,
      hasMoreForActiveFilter: true,
      generateSubcategoryContent: jest.fn().mockResolvedValue(undefined),
      removeContentItem: jest.fn(),
      loadMoreForActiveFilter: jest.fn(),
      replaceContentItem: jest.fn()
    });
    mockUseListingContentActiveMediaItems.mockReturnValue([{ id: "active-1" }]);
    mockUseTemplateRender.mockReturnValue({
      previewItems: [{ id: "preview-1" }],
      isRendering: true,
      renderError: "template-error",
      isTemplateRenderingUnavailable: false
    });
    mockUseListingContentMediaItems.mockReturnValue({
      activeImagePreviewItems: [{ id: "image-1" }],
      imageLoadingCount: 4
    });
    mockUseListingContentPreviewPlans.mockReturnValue([{ id: "plan-1" }]);
    mockUseDeleteCachedPreviewItem.mockReturnValue(jest.fn());
  });

  it("composes the listing content workflow hooks with active state", () => {
    const { result } = renderHook(() =>
      useListingContentWorkflow({
        listingId: "listing-1",
        listingContentItems: [{ id: "content-1" }] as never,
        listingImages: [{ id: "image-1" }] as never,
        listingClipItems: [{ id: "clip-1" }] as never,
        initialMediaTab: "videos",
        initialSubcategory: "new_listing"
      })
    );

    expect(mockUseContentGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "listing-1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing"
      })
    );
    expect(mockUseTemplateRender).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "listing-1",
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        captionItems: [{ id: "active-1" }],
        templateIdForRender: undefined
      })
    );
    expect(result.current.activeContentItems).toEqual([{ id: "active-1" }]);
    expect(result.current.activeImagePreviewItems).toEqual([{ id: "image-1" }]);
    expect(result.current.activePreviewPlans).toEqual([{ id: "plan-1" }]);
    expect(result.current.templateRenderError).toBe("template-error");
    expect(result.current.imageLoadingCount).toBe(4);
  });

  it("passes a trimmed template id through the next generation request", async () => {
    const generateSubcategoryContent = jest.fn().mockResolvedValue(undefined);
    mockUseContentGeneration.mockReturnValue({
      bucketContentItems: [{ id: "content-1" }],
      isGenerating: false,
      generationError: null,
      loadingCount: 0,
      initialPageLoadingCount: 0,
      loadingMoreCount: 0,
      hasMoreForActiveFilter: false,
      generateSubcategoryContent,
      removeContentItem: jest.fn(),
      loadMoreForActiveFilter: jest.fn(),
      replaceContentItem: jest.fn()
    });

    const { result } = renderHook(() =>
      useListingContentWorkflow({
        listingId: "listing-1",
        listingContentItems: [{ id: "content-1" }] as never,
        listingImages: [] as never,
        listingClipItems: [{ id: "clip-1" }] as never,
        initialMediaTab: "videos",
        initialSubcategory: "new_listing"
      })
    );

    await act(async () => {
      await result.current.generateSubcategoryContent("new_listing", {
        templateId: " template-123 "
      });
    });

    expect(generateSubcategoryContent).toHaveBeenCalledWith("new_listing", {
      templateId: " template-123 "
    });
    expect(mockUseTemplateRender).toHaveBeenLastCalledWith(
      expect.objectContaining({
        templateIdForRender: "template-123"
      })
    );
  });
});

import { renderHook, waitFor } from "@testing-library/react";

const mockEmitListingSidebarUpdate = jest.fn();
const mockFetchListingImages = jest.fn();
const mockTriggerCategorization = jest.fn();

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/components/listings/stage/processing/domain/transport", () => ({
  countTerminalInBatch: (images: Array<{ id: string; analysisStatus?: string | null }>, batchImageIds: string[]) => {
    const batchIdSet = new Set(batchImageIds);
    const batchImages = images.filter((image) => batchIdSet.has(image.id));
    const batchCompleted = batchImages.filter(
      (image) =>
        image.analysisStatus === "complete" || image.analysisStatus === "failed"
    ).length;

    return {
      batchImages,
      batchTotal: batchImageIds.length,
      batchCompleted,
      processingCount: batchImages.filter(
        (image) => image.analysisStatus === "processing"
      ).length,
      isComplete:
        batchImageIds.length > 0 && batchCompleted >= batchImageIds.length
    };
  },
  fetchListingImages: (...args: unknown[]) => mockFetchListingImages(...args),
  triggerCategorization: (...args: unknown[]) =>
    mockTriggerCategorization(...args)
}));

import { useCategorizeProcessingFlow } from "@web/src/components/listings/stage/processing/domain/hooks/useCategorizeProcessingFlow";

describe("useCategorizeProcessingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it("derives batch progress from explicit batch image ids", async () => {
    mockFetchListingImages.mockResolvedValue([
      {
        id: "img1",
        url: "https://example.com/1.jpg",
        filename: "1.jpg",
        category: "kitchen",
        confidence: 0.9,
        recommendationScore: 0.8,
        shotType: "room",
        analysisStatus: "complete",
        uploadedAt: new Date().toISOString()
      },
      {
        id: "img2",
        url: "https://example.com/2.jpg",
        filename: "2.jpg",
        category: "living-room",
        confidence: 0.8,
        recommendationScore: 0.7,
        shotType: "room",
        analysisStatus: "processing",
        uploadedAt: new Date().toISOString()
      },
      {
        id: "img3",
        url: "https://example.com/3.jpg",
        filename: "3.jpg",
        category: "other",
        confidence: 0.5,
        recommendationScore: 0.2,
        shotType: "other",
        analysisStatus: "complete",
        uploadedAt: new Date().toISOString()
      }
    ]);
    mockTriggerCategorization.mockResolvedValue(undefined);
    const navigate = jest.fn();

    const { result } = renderHook(() =>
      useCategorizeProcessingFlow({
        mode: "categorize",
        listingId: "l1",
        batchImageIds: ["img1", "img2"],
        navigate
      })
    );

    await waitFor(() => {
      expect(result.current.batchTotal).toBe(2);
    });

    expect(result.current.batchCompleted).toBe(1);
    expect(result.current.progress).toBe(0.5);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.batchImages.map((image) => image.id)).toEqual([
      "img1",
      "img2"
    ]);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("restores batch ids from sessionStorage and navigates when all batch images are terminal", async () => {
    mockFetchListingImages.mockResolvedValue([
      {
        id: "img1",
        url: "https://example.com/1.jpg",
        filename: "1.jpg",
        category: "kitchen",
        confidence: 0.9,
        recommendationScore: 0.8,
        shotType: "room",
        analysisStatus: "complete",
        uploadedAt: new Date().toISOString()
      }
    ]);
    mockTriggerCategorization.mockResolvedValue(undefined);
    const navigate = jest.fn();
    window.sessionStorage.setItem(
      "listing-categorize-processing:l1",
      JSON.stringify({
        batchImageIds: ["img1"],
        batchStartedAt: 123
      })
    );

    const { result } = renderHook(() =>
      useCategorizeProcessingFlow({
        mode: "categorize",
        listingId: "l1",
        navigate
      })
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/listings/l1/stage/categorize");
    });
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalled();
    expect(window.sessionStorage.getItem("listing-categorize-processing:l1")).toBeNull();
  });
});

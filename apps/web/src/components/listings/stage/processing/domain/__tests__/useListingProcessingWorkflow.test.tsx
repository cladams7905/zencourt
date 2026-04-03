import { act, renderHook, waitFor } from "@testing-library/react";

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockFetchPropertyDetails = jest.fn();
const mockUpdateListingStage = jest.fn();
const mockFetchVideoStatus = jest.fn();
const mockFetchListingImages = jest.fn();
const mockTriggerCategorization = jest.fn();
const mockStartListingContentGeneration = jest.fn();
const mockStartVideoGeneration = jest.fn();
const mockCancelVideoGeneration = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/components/listings/stage/processing/domain/transport", () => ({
  countTerminalInBatch: (
    images: { id: string; analysisStatus?: string | null }[],
    batchImageIds: string[]
  ) => {
    const batchIdSet = new Set(batchImageIds);
    const batchImages = images.filter((image) => batchIdSet.has(image.id));
    const batchCompleted = batchImages.filter(
      (image) =>
        image.analysisStatus === "complete" || image.analysisStatus === "failed"
    ).length;
    const processingCount = batchImages.filter(
      (image) => image.analysisStatus === "processing"
    ).length;
    return {
      batchImages,
      batchTotal: batchImageIds.length,
      batchCompleted,
      processingCount,
      isComplete:
        batchImageIds.length > 0 && batchCompleted >= batchImageIds.length
    };
  },
  fetchPropertyDetails: (...args: unknown[]) =>
    mockFetchPropertyDetails(...args),
  updateListingStage: (...args: unknown[]) => mockUpdateListingStage(...args),
  fetchVideoStatus: (...args: unknown[]) => mockFetchVideoStatus(...args),
  fetchListingImages: (...args: unknown[]) => mockFetchListingImages(...args),
  triggerCategorization: (...args: unknown[]) =>
    mockTriggerCategorization(...args),
  startListingContentGeneration: (...args: unknown[]) =>
    mockStartListingContentGeneration(...args),
  startVideoGeneration: (...args: unknown[]) =>
    mockStartVideoGeneration(...args),
  cancelVideoGeneration: (...args: unknown[]) =>
    mockCancelVideoGeneration(...args)
}));

import { useListingProcessingWorkflow } from "@web/src/components/listings/stage/processing/domain/hooks/useListingProcessingWorkflow";

describe("useListingProcessingWorkflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets review error state when property fetch fails", async () => {
    mockFetchPropertyDetails.mockRejectedValue(new Error("IDX unavailable"));

    const { result } = renderHook(() =>
      useListingProcessingWorkflow({
        mode: "review",
        listingId: "l1",
        address: "123 Main",
        navigate: jest.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("IDX unavailable");
    });
  });

  it("cancels generation and navigates to review", async () => {
    const navigate = jest.fn();
    mockFetchVideoStatus.mockResolvedValue({
      batchId: "batch-1",
      status: "processing",
      totalJobs: 1,
      completedJobs: 0,
      failedJobs: 0,
      canceledJobs: 0,
      isTerminal: false,
      allSucceeded: false
    });

    const { result } = renderHook(() =>
      useListingProcessingWorkflow({
        mode: "generate",
        listingId: "l1",
        initialBatchId: "batch-1",
        navigate
      })
    );

    await waitFor(() => {
      expect(result.current.isGenerateMode).toBe(true);
    });

    await act(async () => {
      await result.current.handleCancelGeneration();
    });

    expect(mockCancelVideoGeneration).toHaveBeenCalledWith("batch-1");
    expect(mockUpdateListingStage).toHaveBeenCalledWith("l1", "review");
    expect(navigate).toHaveBeenCalledWith("/listings/l1/stage/review");
  });

  it("builds plan-stage copy and exposes non-generate workflow state", () => {
    const { result } = renderHook(() =>
      useListingProcessingWorkflow({
        mode: "plan",
        listingId: "l1",
        navigate: jest.fn()
      })
    );

    expect(result.current.copy).toEqual({
      title: "Processing listing photos",
      subtitle:
        "We’re categorizing your photos so you can review each room quickly.",
      addressLine: null,
      helperText: "This usually takes a few moments. Please keep this tab open."
    });
    expect(result.current.isGenerateMode).toBe(false);
  });
});
